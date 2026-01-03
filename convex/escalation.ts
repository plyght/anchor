import { internalMutation, internalQuery, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";

interface EscalationConfig {
  timeoutMinutes: number;
  maxEscalationCount: number;
}

const DEFAULT_CONFIG: EscalationConfig = {
  timeoutMinutes: 5,
  maxEscalationCount: 3,
};

export const checkAndEscalateTasks = internalAction({
  args: {
    timeoutMinutes: v.optional(v.number()),
    maxEscalationCount: v.optional(v.number()),
  },
  returns: v.object({
    escalated: v.number(),
    failed: v.number(),
  }),
  handler: async (ctx, args) => {
    const config: EscalationConfig = {
      timeoutMinutes: args.timeoutMinutes ?? DEFAULT_CONFIG.timeoutMinutes,
      maxEscalationCount: args.maxEscalationCount ?? DEFAULT_CONFIG.maxEscalationCount,
    };

    const timeoutThreshold = Date.now() - config.timeoutMinutes * 60 * 1000;

    const timedOutTasks = await ctx.runQuery(
      internal.escalation.getTimedOutTasks,
      {
        timeoutThreshold,
        maxEscalationCount: config.maxEscalationCount,
      }
    );

    let escalated = 0;
    let failed = 0;

    for (const task of timedOutTasks) {
      try {
        await ctx.runMutation(internal.escalation.escalateTask, {
          task_id: task._id,
          incident_id: task.incident_id,
          currentEscalationCount: task.escalation_count,
        });
        escalated++;
      } catch (error) {
        console.error(`Failed to escalate task ${task._id}:`, error);
        failed++;
      }
    }

    return { escalated, failed };
  },
});

export const getTimedOutTasks = internalQuery({
  args: {
    timeoutThreshold: v.number(),
    maxEscalationCount: v.number(),
  },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", "dispatched"))
      .collect();

    return tasks
      .filter(
        (task) =>
          task.dispatched_at &&
          task.dispatched_at < args.timeoutThreshold &&
          task.escalation_count < args.maxEscalationCount
      )
      .map((task) => ({
        _id: task._id,
        incident_id: task.incident_id,
        escalation_count: task.escalation_count,
      }));
  },
});

export const escalateTask = internalMutation({
  args: {
    task_id: v.id("tasks"),
    incident_id: v.id("incidents"),
    currentEscalationCount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const newEscalationCount = args.currentEscalationCount + 1;

    await ctx.db.patch(args.task_id, {
      status: "pending",
      escalation_count: newEscalationCount,
      assigned_volunteer_id: undefined,
      dispatched_at: undefined,
    });

    const assignments = await ctx.db
      .query("task_assignments")
      .withIndex("by_task", (q) => q.eq("task_id", args.task_id))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    for (const assignment of assignments) {
      await ctx.db.patch(assignment._id, {
        status: "timeout",
      });
    }

    await ctx.db.insert("audit_log", {
      entity_type: "task",
      entity_id: args.task_id,
      action: "escalated",
      actor: "system",
      details: {
        escalation_count: newEscalationCount,
        reason: "timeout",
      },
    });

    const matchResult = await ctx.runQuery(api.matching.matchTasksToVolunteers, {
      incident_id: args.incident_id,
    });

    const assignment = matchResult.assignments.find(
      (a: { task_id: string; volunteer_id: string; score: number }) => a.task_id === args.task_id
    );

    if (assignment) {
      await ctx.runMutation(api.matching.assignTaskToVolunteer, {
        task_id: assignment.task_id,
        volunteer_id: assignment.volunteer_id,
      });
    } else {
      await ctx.db.patch(args.task_id, {
        status: "failed",
      });
    }

    return null;
  },
});
