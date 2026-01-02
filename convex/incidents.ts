import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("incidents"),
      _creationTime: v.number(),
      title: v.string(),
      description: v.optional(v.string()),
      incident_type: v.union(
        v.literal("flood"),
        v.literal("fire"),
        v.literal("earthquake"),
        v.literal("medical"),
        v.literal("rescue"),
        v.literal("infrastructure"),
        v.literal("other")
      ),
      severity: v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("critical")
      ),
      trigger_data: v.optional(v.any()),
      status: v.union(
        v.literal("active"),
        v.literal("monitoring"),
        v.literal("resolved"),
        v.literal("cancelled")
      ),
      location: v.optional(
        v.object({
          lat: v.number(),
          lon: v.number(),
          address: v.string(),
        })
      ),
      resolved_at: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query("incidents").order("desc").collect();
  },
});

export const get = query({
  args: { id: v.id("incidents") },
  returns: v.union(
    v.object({
      _id: v.id("incidents"),
      _creationTime: v.number(),
      title: v.string(),
      description: v.optional(v.string()),
      incident_type: v.union(
        v.literal("flood"),
        v.literal("fire"),
        v.literal("earthquake"),
        v.literal("medical"),
        v.literal("rescue"),
        v.literal("infrastructure"),
        v.literal("other")
      ),
      severity: v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("critical")
      ),
      trigger_data: v.optional(v.any()),
      status: v.union(
        v.literal("active"),
        v.literal("monitoring"),
        v.literal("resolved"),
        v.literal("cancelled")
      ),
      location: v.optional(
        v.object({
          lat: v.number(),
          lon: v.number(),
          address: v.string(),
        })
      ),
      resolved_at: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    incident_type: v.union(
      v.literal("flood"),
      v.literal("fire"),
      v.literal("earthquake"),
      v.literal("medical"),
      v.literal("rescue"),
      v.literal("infrastructure"),
      v.literal("other")
    ),
    severity: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    ),
    trigger_data: v.optional(v.any()),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("monitoring"),
        v.literal("resolved"),
        v.literal("cancelled")
      )
    ),
    location: v.optional(
      v.object({
        lat: v.number(),
        lon: v.number(),
        address: v.string(),
      })
    ),
  },
  returns: v.id("incidents"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("incidents", {
      title: args.title,
      description: args.description,
      incident_type: args.incident_type,
      severity: args.severity,
      trigger_data: args.trigger_data,
      status: args.status ?? "active",
      location: args.location,
    });
  },
});

export const getByStatus = query({
  args: {
    status: v.union(
      v.literal("active"),
      v.literal("monitoring"),
      v.literal("resolved"),
      v.literal("cancelled")
    ),
  },
  returns: v.array(
    v.object({
      _id: v.id("incidents"),
      _creationTime: v.number(),
      title: v.string(),
      description: v.optional(v.string()),
      incident_type: v.union(
        v.literal("flood"),
        v.literal("fire"),
        v.literal("earthquake"),
        v.literal("medical"),
        v.literal("rescue"),
        v.literal("infrastructure"),
        v.literal("other")
      ),
      severity: v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("critical")
      ),
      trigger_data: v.optional(v.any()),
      status: v.union(
        v.literal("active"),
        v.literal("monitoring"),
        v.literal("resolved"),
        v.literal("cancelled")
      ),
      location: v.optional(
        v.object({
          lat: v.number(),
          lon: v.number(),
          address: v.string(),
        })
      ),
      resolved_at: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("incidents")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();
  },
});
