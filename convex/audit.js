import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
export const logAuditEvent = mutation({
    args: {
        entity_type: v.union(v.literal("volunteer"), v.literal("incident"), v.literal("task"), v.literal("assignment"), v.literal("system")),
        entity_id: v.optional(v.string()),
        action: v.string(),
        actor: v.optional(v.string()),
        details: v.optional(v.any()),
    },
    returns: v.id("audit_log"),
    handler: async (ctx, args) => {
        return await ctx.db.insert("audit_log", {
            entity_type: args.entity_type,
            entity_id: args.entity_id,
            action: args.action,
            actor: args.actor ?? "system",
            details: args.details ?? {},
        });
    },
});
export const logVolunteerAction = mutation({
    args: {
        volunteer_id: v.id("volunteers"),
        action: v.string(),
        details: v.optional(v.any()),
    },
    returns: v.id("audit_log"),
    handler: async (ctx, args) => {
        return await ctx.db.insert("audit_log", {
            entity_type: "volunteer",
            entity_id: args.volunteer_id,
            action: args.action,
            actor: `volunteer:${args.volunteer_id}`,
            details: args.details ?? {},
        });
    },
});
export const logTaskAction = mutation({
    args: {
        task_id: v.id("tasks"),
        action: v.string(),
        actor: v.optional(v.string()),
        details: v.optional(v.any()),
    },
    returns: v.id("audit_log"),
    handler: async (ctx, args) => {
        return await ctx.db.insert("audit_log", {
            entity_type: "task",
            entity_id: args.task_id,
            action: args.action,
            actor: args.actor ?? "system",
            details: args.details ?? {},
        });
    },
});
export const logIncidentAction = mutation({
    args: {
        incident_id: v.id("incidents"),
        action: v.string(),
        actor: v.optional(v.string()),
        details: v.optional(v.any()),
    },
    returns: v.id("audit_log"),
    handler: async (ctx, args) => {
        return await ctx.db.insert("audit_log", {
            entity_type: "incident",
            entity_id: args.incident_id,
            action: args.action,
            actor: args.actor ?? "system",
            details: args.details ?? {},
        });
    },
});
export const getAuditLog = query({
    args: {
        entity_type: v.optional(v.union(v.literal("volunteer"), v.literal("incident"), v.literal("task"), v.literal("assignment"), v.literal("system"))),
        entity_id: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    returns: v.array(v.object({
        _id: v.id("audit_log"),
        _creationTime: v.number(),
        entity_type: v.union(v.literal("volunteer"), v.literal("incident"), v.literal("task"), v.literal("assignment"), v.literal("system")),
        entity_id: v.optional(v.string()),
        action: v.string(),
        actor: v.optional(v.string()),
        details: v.optional(v.any()),
    })),
    handler: async (ctx, args) => {
        let query = ctx.db.query("audit_log");
        if (args.entity_type && args.entity_id) {
            query = query.withIndex("by_entity", (q) => q.eq("entity_type", args.entity_type).eq("entity_id", args.entity_id));
        }
        else if (args.entity_type) {
            query = query
                .withIndex("by_entity", (q) => q.eq("entity_type", args.entity_type))
                .filter((q) => q.eq(q.field("entity_type"), args.entity_type));
        }
        return await query.order("desc").take(args.limit ?? 100);
    },
});
