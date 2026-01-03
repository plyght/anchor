import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

interface Location {
  lat: number;
  lon: number;
  address: string;
}

function calculateDistance(loc1: Location, loc2: Location): number {
  const R = 6371;
  const dLat = ((loc2.lat - loc1.lat) * Math.PI) / 180;
  const dLon = ((loc2.lon - loc1.lon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((loc1.lat * Math.PI) / 180) *
      Math.cos((loc2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function isAvailableNow(
  availabilitySchedule: Record<string, string[]>
): boolean {
  const now = new Date();
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const currentDay = dayNames[now.getDay()];
  if (!currentDay) {
    return false;
  }
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const schedule = availabilitySchedule[currentDay] || [];

  for (const slot of schedule) {
    if (slot === "all_day") return true;

    const [start, end] = slot.split("-");
    if (!start || !end) continue;

    const startParts = start.split(":");
    const endParts = end.split(":");
    if (startParts.length < 2 || endParts.length < 2) continue;

    const startHour = Number(startParts[0]);
    const startMin = Number(startParts[1]);
    const endHour = Number(endParts[0]);
    const endMin = Number(endParts[1]);
    
    if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) continue;

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (currentTime >= startTime && currentTime <= endTime) {
      return true;
    }
  }

  return false;
}

function hasRequiredSkills(
  volunteerSkills: string[],
  requiredSkills: string[]
): boolean {
  if (requiredSkills.length === 0) return true;
  return requiredSkills.some((skill) => volunteerSkills.includes(skill));
}

function calculateMatchScore(
  volunteer: {
    current_status: string;
    availability_schedule: Record<string, string[]>;
    skills: string[];
    location?: Location;
  },
  task: {
    required_skills: string[];
    priority: string;
    location?: Location;
  },
  taskLocation?: Location
): number {
  let score = 0;

  if (volunteer.current_status !== "online" && volunteer.current_status !== "responding") return 0;

  if (!isAvailableNow(volunteer.availability_schedule)) return 0;

  const hasSkills = hasRequiredSkills(volunteer.skills, task.required_skills);
  if (!hasSkills) return 0;

  score += 50;

  const matchingSkillsCount = task.required_skills.filter((skill) =>
    volunteer.skills.includes(skill)
  ).length;
  score += matchingSkillsCount * 10;

  if (taskLocation && volunteer.location) {
    const distance = calculateDistance(volunteer.location, taskLocation);

    if (distance <= 5) {
      score += 30;
    } else if (distance <= 10) {
      score += 20;
    } else if (distance <= 20) {
      score += 10;
    }
  }

  if (task.priority === "urgent") {
    score += 20;
  } else if (task.priority === "high") {
    score += 10;
  }

  return score;
}

export const matchTasksToVolunteers = query({
  args: {
    incident_id: v.id("incidents"),
  },
  returns: v.object({
    assignments: v.array(
      v.object({
        task_id: v.id("tasks"),
        volunteer_id: v.id("volunteers"),
        score: v.number(),
      })
    ),
    unmatched: v.array(v.id("tasks")),
  }),
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_incident", (q) => q.eq("incident_id", args.incident_id))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    const volunteers = await ctx.db
      .query("volunteers")
      .filter((q) => 
        q.or(
          q.eq(q.field("current_status"), "online"),
          q.eq(q.field("current_status"), "responding")
        )
      )
      .collect();

    const usedVolunteers = new Set<string>();
    const assignments: Array<{
      task_id: Id<"tasks">;
      volunteer_id: Id<"volunteers">;
      score: number;
    }> = [];
    const unmatched: Id<"tasks">[] = [];

    const tasksByPriority = [...tasks].sort((a, b) => {
      const priorityOrder: Record<string, number> = {
        urgent: 0,
        high: 1,
        medium: 2,
        low: 3,
      };
      const aPriority = priorityOrder[a.priority] ?? 999;
      const bPriority = priorityOrder[b.priority] ?? 999;
      return aPriority - bPriority;
    });

    for (const task of tasksByPriority) {
      const availableVolunteers = volunteers.filter(
        (v) => !usedVolunteers.has(v._id)
      );

      if (availableVolunteers.length === 0) {
        unmatched.push(task._id);
        continue;
      }

      const scoredVolunteers = availableVolunteers
        .map((volunteer) => ({
          volunteer,
          score: calculateMatchScore(volunteer, task, task.location),
        }))
        .filter((v) => v.score > 0)
        .sort((a, b) => b.score - a.score);

      if (scoredVolunteers.length === 0) {
        unmatched.push(task._id);
        continue;
      }

      const bestMatch = scoredVolunteers[0];
      if (!bestMatch) {
        unmatched.push(task._id);
        continue;
      }

      assignments.push({
        task_id: task._id,
        volunteer_id: bestMatch.volunteer._id,
        score: bestMatch.score,
      });
      usedVolunteers.add(bestMatch.volunteer._id);
    }

    return { assignments, unmatched };
  },
});

export const assignTaskToVolunteer = mutation({
  args: {
    task_id: v.id("tasks"),
    volunteer_id: v.id("volunteers"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.task_id);
    if (!task) {
      throw new Error("Task not found");
    }

    await ctx.db.patch(args.task_id, {
      assigned_volunteer_id: args.volunteer_id,
      status: "dispatched",
      dispatched_at: Date.now(),
    });

    await ctx.db.insert("task_assignments", {
      task_id: args.task_id,
      volunteer_id: args.volunteer_id,
      acceptance_code: task.acceptance_code,
      status: "pending",
    });

    await ctx.runMutation(api.audit.logTaskAction, {
      task_id: args.task_id,
      action: "assigned",
      actor: "system",
      details: { volunteer_id: args.volunteer_id },
    });

    return null;
  },
});

export const matchIncident = mutation({
  args: {
    incident_id: v.id("incidents"),
  },
  returns: v.object({
    matched: v.number(),
    unmatched: v.number(),
    assignments: v.array(
      v.object({
        task_id: v.id("tasks"),
        volunteer_id: v.id("volunteers"),
        match_score: v.number(),
      })
    ),
    unmatched_task_ids: v.array(v.id("tasks")),
  }),
  handler: async (ctx, args) => {
    const matchResult: {
      assignments: Array<{ task_id: Id<"tasks">; volunteer_id: Id<"volunteers">; score: number }>;
      unmatched: Id<"tasks">[];
    } = await ctx.runQuery(api.matching.matchTasksToVolunteers, {
      incident_id: args.incident_id,
    });

    for (const assignment of matchResult.assignments) {
      await ctx.runMutation(api.matching.assignTaskToVolunteer, {
        task_id: assignment.task_id,
        volunteer_id: assignment.volunteer_id,
      });
    }

    return {
      matched: matchResult.assignments.length,
      unmatched: matchResult.unmatched.length,
      assignments: matchResult.assignments.map((a: { task_id: Id<"tasks">; volunteer_id: Id<"volunteers">; score: number }) => ({
        task_id: a.task_id,
        volunteer_id: a.volunteer_id,
        match_score: a.score,
      })),
      unmatched_task_ids: matchResult.unmatched,
    };
  },
});
