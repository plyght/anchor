import { action, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SKILL_DESCRIPTIONS: Record<string, string> = {
  first_aid: "First Aid - Basic emergency medical care and wound treatment",
  cpr: "CPR Certified - Cardiopulmonary resuscitation trained",
  emt: "EMT/Paramedic - Advanced emergency medical technician",
  nursing: "Nursing - Professional nursing care and medical assessment",
  search_rescue: "Search & Rescue - Locating and extracting people from dangerous situations",
  firefighting: "Firefighting - Fire suppression and hazmat response",
  water_rescue: "Water Rescue - Swift water and drowning victim recovery",
  climbing: "Climbing/Rope Work - Technical rescue and vertical operations",
  driving: "Licensed Driver - Vehicle operation for transport and logistics",
  heavy_equipment: "Heavy Equipment - Operating machinery like excavators, forklifts",
  radio_comms: "Radio Communications - Ham radio and emergency communication systems",
  translation: "Translation Services - Multi-language interpretation",
  counseling: "Crisis Counseling - Mental health and emotional support",
  childcare: "Childcare - Care for displaced or separated children",
  animal_care: "Animal Care - Rescue and care for animals",
  cooking: "Mass Cooking - Preparing food for large groups",
};

interface VolunteerProfile {
  _id: string;
  full_name: string;
  skills: string[];
  current_status: string;
  location?: { lat: number; lon: number; address: string };
}

interface RoutingResult {
  volunteer_id: string;
  volunteer_name: string;
  confidence: number;
  reasoning: string;
  matched_skills: string[];
}

export const analyzeMessageAndRoute = action({
  args: {
    message: v.string(),
    incident_context: v.optional(v.string()),
    location_hint: v.optional(v.string()),
  },
  returns: v.object({
    analysis: v.object({
      message_type: v.string(),
      urgency: v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("critical")
      ),
      required_skills: v.array(v.string()),
      summary: v.string(),
    }),
    recommended_volunteers: v.array(
      v.object({
        volunteer_id: v.string(),
        volunteer_name: v.string(),
        confidence: v.number(),
        reasoning: v.string(),
        matched_skills: v.array(v.string()),
      })
    ),
    suggested_response: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<{
    analysis: {
      message_type: string;
      urgency: "low" | "medium" | "high" | "critical";
      required_skills: string[];
      summary: string;
    };
    recommended_volunteers: RoutingResult[];
    suggested_response?: string;
  }> => {
    const volunteers: VolunteerProfile[] = await ctx.runQuery(api.volunteers.list);
    const onlineVolunteers = volunteers.filter(
      (v) => v.current_status === "online" || v.current_status === "responding"
    );

    const volunteerProfiles = onlineVolunteers.map((v) => ({
      id: v._id,
      name: v.full_name,
      skills: v.skills.map((s) => SKILL_DESCRIPTIONS[s] || s),
      location: v.location?.address || "Unknown",
    }));

    const systemPrompt = `You are an emergency response coordinator AI. Your job is to analyze incoming messages and determine:
1. The type and urgency of the request
2. What skills are needed to respond
3. Which available volunteers are best suited to handle it

Available skills in the system:
${Object.entries(SKILL_DESCRIPTIONS)
  .map(([id, desc]) => `- ${id}: ${desc}`)
  .join("\n")}

Available volunteers:
${JSON.stringify(volunteerProfiles, null, 2)}

Respond with a JSON object in this exact format:
{
  "analysis": {
    "message_type": "medical|rescue|logistics|communication|support|assessment|other",
    "urgency": "low|medium|high|critical",
    "required_skills": ["skill_id1", "skill_id2"],
    "summary": "Brief summary of what's needed"
  },
  "recommended_volunteers": [
    {
      "volunteer_id": "id",
      "volunteer_name": "name",
      "confidence": 0.0-1.0,
      "reasoning": "Why this volunteer is a good match",
      "matched_skills": ["skill_id1"]
    }
  ],
  "suggested_response": "Optional suggested initial response message"
}

Rank volunteers by relevance. Include up to 3 best matches. If no good matches exist, return an empty array.`;

    const userPrompt = `Incoming message: "${args.message}"
${args.incident_context ? `\nIncident context: ${args.incident_context}` : ""}
${args.location_hint ? `\nLocation: ${args.location_hint}` : ""}

Analyze this message and recommend the best volunteers to handle it.`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error("No response from OpenAI");
      }

      const parsed = JSON.parse(responseText) as {
        analysis: {
          message_type: string;
          urgency: "low" | "medium" | "high" | "critical";
          required_skills: string[];
          summary: string;
        };
        recommended_volunteers: RoutingResult[];
        suggested_response?: string;
      };

      return {
        analysis: parsed.analysis,
        recommended_volunteers: parsed.recommended_volunteers || [],
        suggested_response: parsed.suggested_response,
      };
    } catch (error) {
      console.error("OpenAI routing error:", error);
      return {
        analysis: {
          message_type: "other",
          urgency: "medium",
          required_skills: [],
          summary: "Unable to analyze message automatically",
        },
        recommended_volunteers: [],
        suggested_response: undefined,
      };
    }
  },
});

export const generateTaskDescription = action({
  args: {
    incident_title: v.string(),
    incident_type: v.string(),
    incident_description: v.optional(v.string()),
    task_type: v.string(),
  },
  returns: v.object({
    title: v.string(),
    description: v.string(),
    required_skills: v.array(v.string()),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
  }),
  handler: async (_ctx, args) => {
    const systemPrompt = `You are an emergency response coordinator. Generate a clear, actionable task based on the incident information provided.

Available skills that can be required:
${Object.keys(SKILL_DESCRIPTIONS).join(", ")}

Respond with a JSON object:
{
  "title": "Clear, concise task title",
  "description": "Detailed but brief description of what needs to be done",
  "required_skills": ["skill_id1", "skill_id2"],
  "priority": "low|medium|high|urgent"
}`;

    const userPrompt = `Incident: ${args.incident_title}
Type: ${args.incident_type}
${args.incident_description ? `Description: ${args.incident_description}` : ""}
Task Type: ${args.task_type}

Generate an appropriate task for this incident.`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error("No response from OpenAI");
      }

      return JSON.parse(responseText) as {
        title: string;
        description: string;
        required_skills: string[];
        priority: "low" | "medium" | "high" | "urgent";
      };
    } catch (error) {
      console.error("Task generation error:", error);
      return {
        title: `${args.task_type} for ${args.incident_title}`,
        description: args.incident_description || "Task requires manual description",
        required_skills: [],
        priority: "medium" as const,
      };
    }
  },
});

interface VolunteerMatchResult {
  volunteer_id: string;
  volunteer_name: string;
  confidence: number;
  reasoning: string;
}

interface TaskMatchResponse {
  best_match: VolunteerMatchResult | null;
  alternatives: VolunteerMatchResult[];
}

interface TaskData {
  title: string;
  description?: string;
  task_type: string;
  priority: string;
  required_skills: string[];
  location?: { address: string };
}

export const matchVolunteerToTask = action({
  args: {
    task_id: v.id("tasks"),
  },
  returns: v.object({
    best_match: v.union(
      v.object({
        volunteer_id: v.string(),
        volunteer_name: v.string(),
        confidence: v.number(),
        reasoning: v.string(),
      }),
      v.null()
    ),
    alternatives: v.array(
      v.object({
        volunteer_id: v.string(),
        volunteer_name: v.string(),
        confidence: v.number(),
        reasoning: v.string(),
      })
    ),
  }),
  handler: async (ctx, args): Promise<TaskMatchResponse> => {
    const taskResult = await ctx.runQuery(api.tasks.get, { id: args.task_id });
    if (!taskResult) {
      return { best_match: null, alternatives: [] };
    }
    const task: TaskData = taskResult;

    const volunteers: VolunteerProfile[] = await ctx.runQuery(api.volunteers.list);
    const onlineVolunteers = volunteers.filter(
      (vol) => vol.current_status === "online"
    );

    if (onlineVolunteers.length === 0) {
      return { best_match: null, alternatives: [] };
    }

    const volunteerProfiles = onlineVolunteers.map((vol) => ({
      id: vol._id,
      name: vol.full_name,
      skills: vol.skills.map((s) => SKILL_DESCRIPTIONS[s] || s),
      location: vol.location?.address || "Unknown",
    }));

    const systemPrompt: string = `You are an emergency response coordinator. Match the best volunteer to this task based on their skills and the task requirements.

Available volunteers:
${JSON.stringify(volunteerProfiles, null, 2)}

Respond with JSON:
{
  "best_match": {
    "volunteer_id": "id",
    "volunteer_name": "name", 
    "confidence": 0.0-1.0,
    "reasoning": "Why this is the best match"
  },
  "alternatives": [
    {
      "volunteer_id": "id",
      "volunteer_name": "name",
      "confidence": 0.0-1.0,
      "reasoning": "Why this could also work"
    }
  ]
}

If no good match exists, set best_match to null.`;

    const taskUserPrompt: string = `Task: ${task.title}
${task.description ? `Description: ${task.description}` : ""}
Type: ${task.task_type}
Priority: ${task.priority}
Required Skills: ${task.required_skills.join(", ") || "None specified"}
${task.location ? `Location: ${task.location.address}` : ""}

Find the best volunteer match.`;

    try {
      const aiCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: taskUserPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const aiResponseText: string | null | undefined = aiCompletion.choices[0]?.message?.content;
      if (!aiResponseText) {
        throw new Error("No response from OpenAI");
      }

      const parsed: TaskMatchResponse = JSON.parse(aiResponseText);
      return parsed;
    } catch (error) {
      console.error("Volunteer matching error:", error);
      return { best_match: null, alternatives: [] };
    }
  },
});

export const getRoutingCapabilities = query({
  args: {},
  returns: v.object({
    available_skills: v.array(
      v.object({
        id: v.string(),
        description: v.string(),
      })
    ),
    message_types: v.array(v.string()),
    urgency_levels: v.array(v.string()),
  }),
  handler: async () => {
    return {
      available_skills: Object.entries(SKILL_DESCRIPTIONS).map(([id, description]) => ({
        id,
        description,
      })),
      message_types: ["medical", "rescue", "logistics", "communication", "support", "assessment", "other"],
      urgency_levels: ["low", "medium", "high", "critical"],
    };
  },
});
