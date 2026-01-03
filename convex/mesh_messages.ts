import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    direction: v.union(v.literal("inbound"), v.literal("outbound")),
    message_content: v.string(),
    task_id: v.optional(v.id("tasks")),
    volunteer_bitchat_username: v.optional(v.string()),
  },
  returns: v.id("mesh_messages"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("mesh_messages", {
      direction: args.direction,
      message_content: args.message_content,
      task_id: args.task_id,
      volunteer_bitchat_username: args.volunteer_bitchat_username,
    });
  },
});

export const listByTask = query({
  args: { task_id: v.id("tasks") },
  returns: v.array(
    v.object({
      _id: v.id("mesh_messages"),
      _creationTime: v.number(),
      direction: v.union(v.literal("inbound"), v.literal("outbound")),
      message_content: v.string(),
      task_id: v.optional(v.id("tasks")),
      volunteer_bitchat_username: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("mesh_messages")
      .withIndex("by_task", (q) => q.eq("task_id", args.task_id))
      .order("desc")
      .collect();
  },
});

export const listByVolunteer = query({
  args: { volunteer_bitchat_username: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("mesh_messages"),
      _creationTime: v.number(),
      direction: v.union(v.literal("inbound"), v.literal("outbound")),
      message_content: v.string(),
      task_id: v.optional(v.id("tasks")),
      volunteer_bitchat_username: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("mesh_messages")
      .withIndex("by_volunteer", (q) =>
        q.eq("volunteer_bitchat_username", args.volunteer_bitchat_username)
      )
      .order("desc")
      .collect();
  },
});

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("mesh_messages"),
      _creationTime: v.number(),
      direction: v.union(v.literal("inbound"), v.literal("outbound")),
      message_content: v.string(),
      task_id: v.optional(v.id("tasks")),
      volunteer_bitchat_username: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("mesh_messages")
      .order("desc")
      .take(100);
  },
});
