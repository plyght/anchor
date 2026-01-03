import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { api } from "./_generated/api";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth, { cors: true });

http.route({
  path: "/flood-alert",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json() as {
      title: string;
      description: string;
      incident_type: "flood" | "fire" | "earthquake" | "medical" | "rescue" | "infrastructure" | "other";
      severity: "low" | "medium" | "high" | "critical";
      trigger_data?: any;
      location?: {
        lat: number;
        lon: number;
        address: string;
      };
    };
    
    try {
      const incidentId = await ctx.runMutation(api.incidents.create, {
        title: body.title,
        description: body.description,
        incident_type: body.incident_type,
        severity: body.severity,
        trigger_data: body.trigger_data,
        status: "active",
        location: body.location,
      });

      return new Response(JSON.stringify({ 
        success: true, 
        incident_id: incidentId 
      }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Flood alert error:", error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;
