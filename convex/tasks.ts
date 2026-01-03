import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

function generateAcceptanceCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("dispatched"),
        v.literal("accepted"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled"),
        v.literal("failed")
      )
    ),
    incident_id: v.optional(v.id("incidents")),
  },
  returns: v.array(
    v.object({
      _id: v.id("tasks"),
      _creationTime: v.number(),
      incident_id: v.id("incidents"),
      title: v.string(),
      description: v.optional(v.string()),
      task_type: v.union(
        v.literal("assessment"),
        v.literal("rescue"),
        v.literal("medical"),
        v.literal("evacuation"),
        v.literal("supplies"),
        v.literal("communication"),
        v.literal("coordination")
      ),
      priority: v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("urgent")
      ),
      required_skills: v.array(v.string()),
      location: v.optional(
        v.object({
          lat: v.number(),
          lon: v.number(),
          address: v.string(),
        })
      ),
      assigned_volunteer_id: v.optional(v.id("volunteers")),
      acceptance_code: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("dispatched"),
        v.literal("accepted"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled"),
        v.literal("failed")
      ),
      dispatched_at: v.optional(v.number()),
      accepted_at: v.optional(v.number()),
      completed_at: v.optional(v.number()),
      escalation_count: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    let query = ctx.db.query("tasks").fullTableScan();

    if (args.incident_id) {
      query = ctx.db
        .query("tasks")
        .withIndex("by_incident", (q) =>
          q.eq("incident_id", args.incident_id!)
        );
    } else if (args.status) {
      query = ctx.db
        .query("tasks")
        .withIndex("by_status", (q) =>
          q.eq("status", args.status!)
        );
    }

    return await query.order("desc").collect();
  },
});

export const get = query({
  args: { id: v.id("tasks") },
  returns: v.union(
    v.object({
      _id: v.id("tasks"),
      _creationTime: v.number(),
      incident_id: v.id("incidents"),
      title: v.string(),
      description: v.optional(v.string()),
      task_type: v.union(
        v.literal("assessment"),
        v.literal("rescue"),
        v.literal("medical"),
        v.literal("evacuation"),
        v.literal("supplies"),
        v.literal("communication"),
        v.literal("coordination")
      ),
      priority: v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("urgent")
      ),
      required_skills: v.array(v.string()),
      location: v.optional(
        v.object({
          lat: v.number(),
          lon: v.number(),
          address: v.string(),
        })
      ),
      assigned_volunteer_id: v.optional(v.id("volunteers")),
      acceptance_code: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("dispatched"),
        v.literal("accepted"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled"),
        v.literal("failed")
      ),
      dispatched_at: v.optional(v.number()),
      accepted_at: v.optional(v.number()),
      completed_at: v.optional(v.number()),
      escalation_count: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    incident_id: v.id("incidents"),
    title: v.string(),
    description: v.optional(v.string()),
    task_type: v.union(
      v.literal("assessment"),
      v.literal("rescue"),
      v.literal("medical"),
      v.literal("evacuation"),
      v.literal("supplies"),
      v.literal("communication"),
      v.literal("coordination")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
    required_skills: v.optional(v.array(v.string())),
    location: v.optional(
      v.object({
        lat: v.number(),
        lon: v.number(),
        address: v.string(),
      })
    ),
    acceptance_code: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("dispatched"),
        v.literal("accepted"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled"),
        v.literal("failed")
      )
    ),
    escalation_count: v.optional(v.number()),
  },
  returns: v.id("tasks"),
  handler: async (ctx, args) => {
    let code = args.acceptance_code;
    if (!code) {
      code = generateAcceptanceCode();
      const existing = await ctx.db
        .query("tasks")
        .filter((q) => q.eq(q.field("acceptance_code"), code))
        .first();
      if (existing) {
        code = generateAcceptanceCode();
      }
    }

    return await ctx.db.insert("tasks", {
      incident_id: args.incident_id,
      title: args.title,
      description: args.description,
      task_type: args.task_type,
      priority: args.priority,
      required_skills: args.required_skills ?? [],
      location: args.location,
      acceptance_code: code,
      status: args.status ?? "pending",
      escalation_count: args.escalation_count ?? 0,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    task_type: v.optional(
      v.union(
        v.literal("assessment"),
        v.literal("rescue"),
        v.literal("medical"),
        v.literal("evacuation"),
        v.literal("supplies"),
        v.literal("communication"),
        v.literal("coordination")
      )
    ),
    priority: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("urgent")
      )
    ),
    required_skills: v.optional(v.array(v.string())),
    location: v.optional(
      v.object({
        lat: v.number(),
        lon: v.number(),
        address: v.string(),
      })
    ),
    assigned_volunteer_id: v.optional(v.id("volunteers")),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("dispatched"),
        v.literal("accepted"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled"),
        v.literal("failed")
      )
    ),
    dispatched_at: v.optional(v.number()),
    accepted_at: v.optional(v.number()),
    completed_at: v.optional(v.number()),
    escalation_count: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Task not found");
    }
    await ctx.db.patch(id, updates);
    return null;
  },
});

export const generateForIncident = mutation({
  args: {
    incident_id: v.id("incidents"),
  },
  returns: v.array(v.id("tasks")),
  handler: async (ctx, args) => {
    const floodTasks = [
      {
        title: "Check levee integrity",
        description: "Inspect levee for cracks and structural damage",
        task_type: "assessment" as const,
        priority: "urgent" as const,
        required_skills: ["inspection", "engineering"],
      },
      {
        title: "Assess property damage",
        description: "Document water damage to residential properties",
        task_type: "assessment" as const,
        priority: "high" as const,
        required_skills: ["inspection", "documentation"],
      },
      {
        title: "Distribute sandbags",
        description: "Deliver and place sandbags at critical locations",
        task_type: "supplies" as const,
        priority: "high" as const,
        required_skills: ["heavy_lifting", "driving"],
      },
      {
        title: "Document water levels",
        description: "Take photos and measurements of current water levels",
        task_type: "assessment" as const,
        priority: "medium" as const,
        required_skills: ["documentation"],
      },
    ];

    const taskIds: Array<Id<"tasks">> = [];
    for (const task of floodTasks) {
      let code = generateAcceptanceCode();
      const existing = await ctx.db
        .query("tasks")
        .filter((q) => q.eq(q.field("acceptance_code"), code))
        .first();
      if (existing) {
        code = generateAcceptanceCode();
      }

      const taskId = await ctx.db.insert("tasks", {
        incident_id: args.incident_id,
        title: task.title,
        description: task.description,
        task_type: task.task_type,
        priority: task.priority,
        required_skills: task.required_skills,
        acceptance_code: code,
        status: "pending",
        escalation_count: 0,
      });
      taskIds.push(taskId);
    }

    return taskIds;
  },
});
