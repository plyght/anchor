import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  volunteers: defineTable({
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
    is_admin: v.optional(v.boolean()),
  })
    .index("by_bitchat_username", ["bitchat_username"])
    .index("by_status", ["current_status"]),

  incidents: defineTable({
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
  }).index("by_status", ["status"]),

  tasks: defineTable({
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
    .index("by_status", ["status"])
    .index("by_incident", ["incident_id"])
    .index("by_assigned_volunteer", ["assigned_volunteer_id"]),

  task_assignments: defineTable({
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
    .index("by_task", ["task_id"])
    .index("by_volunteer", ["volunteer_id"]),

  audit_log: defineTable({
    entity_type: v.union(
      v.literal("volunteer"),
      v.literal("incident"),
      v.literal("task"),
      v.literal("assignment"),
      v.literal("system")
    ),
    entity_id: v.optional(v.string()),
    action: v.string(),
    actor: v.optional(v.string()),
    details: v.optional(v.any()),
  })
    .index("by_entity", ["entity_type", "entity_id"]),

  mesh_messages: defineTable({
    direction: v.union(v.literal("inbound"), v.literal("outbound")),
    message_content: v.string(),
    task_id: v.optional(v.id("tasks")),
    volunteer_bitchat_username: v.optional(v.string()),
  })
    .index("by_task", ["task_id"])
    .index("by_volunteer", ["volunteer_bitchat_username"]),
});
