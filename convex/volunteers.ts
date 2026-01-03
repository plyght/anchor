import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";

export const getMyProfile = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("volunteers"),
      _creationTime: v.number(),
      user_id: v.string(),
      full_name: v.string(),
      bitchat_username: v.string(),
      phone: v.optional(v.string()),
      email: v.optional(v.string()),
      skills: v.array(v.string()),
      availability_schedule: v.record(v.string(), v.array(v.string())),
      current_status: v.union(
        v.literal("online"),
        v.literal("offline"),
        v.literal("busy"),
        v.literal("responding")
      ),
      location: v.optional(
        v.object({
          lat: v.number(),
          lon: v.number(),
          address: v.string(),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx: any) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      return null;
    }
    const volunteer = await ctx.db
      .query("volunteers")
      .filter((q: any) => q.eq(q.field("user_id"), user.userId || user._id))
      .first();
    return volunteer;
  },
});

export const hasCompletedOnboarding = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx: any) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      return false;
    }
    const volunteer = await ctx.db
      .query("volunteers")
      .filter((q: any) => q.eq(q.field("user_id"), user.userId || user._id))
      .first();
    return volunteer !== null;
  },
});

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("volunteers"),
      _creationTime: v.number(),
      user_id: v.string(),
      full_name: v.string(),
      bitchat_username: v.string(),
      phone: v.optional(v.string()),
      email: v.optional(v.string()),
      skills: v.array(v.string()),
      availability_schedule: v.record(v.string(), v.array(v.string())),
      current_status: v.union(
        v.literal("online"),
        v.literal("offline"),
        v.literal("busy"),
        v.literal("responding")
      ),
      location: v.optional(
        v.object({
          lat: v.number(),
          lon: v.number(),
          address: v.string(),
        })
      ),
    })
  ),
  handler: async (ctx: any) => {
    const volunteers = await ctx.db
      .query("volunteers")
      .order("desc")
      .collect();
    return volunteers;
  },
});

export const get = query({
  args: { id: v.id("volunteers") },
  returns: v.union(
    v.object({
      _id: v.id("volunteers"),
      _creationTime: v.number(),
      user_id: v.string(),
      full_name: v.string(),
      bitchat_username: v.string(),
      phone: v.optional(v.string()),
      email: v.optional(v.string()),
      skills: v.array(v.string()),
      availability_schedule: v.record(v.string(), v.array(v.string())),
      current_status: v.union(
        v.literal("online"),
        v.literal("offline"),
        v.literal("busy"),
        v.literal("responding")
      ),
      location: v.optional(
        v.object({
          lat: v.number(),
          lon: v.number(),
          address: v.string(),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx: any, args: any) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    user_id: v.optional(v.string()),
    full_name: v.string(),
    bitchat_username: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    skills: v.optional(v.array(v.string())),
    availability_schedule: v.optional(v.record(v.string(), v.array(v.string()))),
    current_status: v.optional(
      v.union(
        v.literal("online"),
        v.literal("offline"),
        v.literal("busy"),
        v.literal("responding")
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
  returns: v.id("volunteers"),
  handler: async (ctx: any, args: any) => {
    const user = await authComponent.getAuthUser(ctx);
    const userId = (user?.userId || user?._id) ?? args.user_id ?? "anonymous";
    
    const existing = await ctx.db
      .query("volunteers")
      .filter((q: any) => q.eq(q.field("user_id"), userId))
      .first();
    
    if (existing) {
      throw new Error("Volunteer profile already exists for this user");
    }

    return await ctx.db.insert("volunteers", {
      user_id: userId,
      full_name: args.full_name,
      bitchat_username: args.bitchat_username,
      phone: args.phone,
      email: args.email,
      skills: args.skills ?? [],
      availability_schedule: args.availability_schedule ?? {},
      current_status: args.current_status ?? "offline",
      location: args.location,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("volunteers"),
    user_id: v.optional(v.string()),
    full_name: v.optional(v.string()),
    bitchat_username: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    skills: v.optional(v.array(v.string())),
    availability_schedule: v.optional(v.record(v.string(), v.array(v.string()))),
    current_status: v.optional(
      v.union(
        v.literal("online"),
        v.literal("offline"),
        v.literal("busy"),
        v.literal("responding")
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
  returns: v.null(),
  handler: async (ctx: any, args: any) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Volunteer not found");
    }
    await ctx.db.patch(id, updates);
    return null;
  },
});

export const getByStatus = query({
  args: {
    status: v.union(
      v.literal("online"),
      v.literal("offline"),
      v.literal("busy"),
      v.literal("responding")
    ),
  },
  returns: v.array(
    v.object({
      _id: v.id("volunteers"),
      _creationTime: v.number(),
      user_id: v.string(),
      full_name: v.string(),
      bitchat_username: v.string(),
      phone: v.optional(v.string()),
      email: v.optional(v.string()),
      skills: v.array(v.string()),
      availability_schedule: v.record(v.string(), v.array(v.string())),
      current_status: v.union(
        v.literal("online"),
        v.literal("offline"),
        v.literal("busy"),
        v.literal("responding")
      ),
      location: v.optional(
        v.object({
          lat: v.number(),
          lon: v.number(),
          address: v.string(),
        })
      ),
    })
  ),
  handler: async (ctx: any, args: any) => {
    return await ctx.db
      .query("volunteers")
      .withIndex("by_status", (q: any) => q.eq("current_status", args.status))
      .collect();
  },
});
