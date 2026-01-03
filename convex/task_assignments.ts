import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    task_id: v.id("tasks"),
    volunteer_id: v.id("volunteers"),
    acceptance_code: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
      v.literal("timeout"),
      v.literal("reassigned")
    ),
    response_message: v.optional(v.string()),
    responded_at: v.optional(v.number()),
  },
  returns: v.id("task_assignments"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("task_assignments", {
      task_id: args.task_id,
      volunteer_id: args.volunteer_id,
      acceptance_code: args.acceptance_code,
      status: args.status,
      response_message: args.response_message,
      responded_at: args.responded_at,
    });
  },
});

export const listByTask = query({
  args: { task_id: v.id("tasks") },
  returns: v.array(
    v.object({
      _id: v.id("task_assignments"),
      _creationTime: v.number(),
      task_id: v.id("tasks"),
      volunteer_id: v.id("volunteers"),
      acceptance_code: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("accepted"),
        v.literal("declined"),
        v.literal("timeout"),
        v.literal("reassigned")
      ),
      response_message: v.optional(v.string()),
      responded_at: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("task_assignments")
      .withIndex("by_task", (q) => q.eq("task_id", args.task_id))
      .collect();
  },
});

export const listByVolunteer = query({
  args: { volunteer_id: v.id("volunteers") },
  returns: v.array(
    v.object({
      _id: v.id("task_assignments"),
      _creationTime: v.number(),
      task_id: v.id("tasks"),
      volunteer_id: v.id("volunteers"),
      acceptance_code: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("accepted"),
        v.literal("declined"),
        v.literal("timeout"),
        v.literal("reassigned")
      ),
      response_message: v.optional(v.string()),
      responded_at: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("task_assignments")
      .withIndex("by_volunteer", (q) => q.eq("volunteer_id", args.volunteer_id))
      .collect();
  },
});
