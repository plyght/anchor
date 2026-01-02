import { Context } from "../../../bundler/context.js";
import { components } from "../../generatedApi.js";
/**
 * Verified emails for a user that aren't known to be an admin email for
 * another WorkOS integration.
 */
export declare function getCandidateEmailsForWorkIntegration(ctx: Context): Promise<components["schemas"]["AvailableWorkOSTeamEmailsResponse"]>;
export declare function getInvitationEligibleEmails(ctx: Context, teamId: number): Promise<{
    eligibleEmails: string[];
    adminEmail?: string;
}>;
export declare function getDeploymentCanProvisionWorkOSEnvironments(ctx: Context, deploymentName: string): Promise<components["schemas"]["HasAssociatedWorkOSTeamResponse"]>;
export declare function createEnvironmentAndAPIKey(ctx: Context, deploymentName: string, environmentName?: string): Promise<{
    success: true;
    data: components["schemas"]["ProvisionEnvironmentResponse"];
} | {
    success: false;
    error: "team_not_provisioned";
    message: string;
}>;
export declare function createAssociatedWorkosTeam(ctx: Context, teamId: number, email: string): Promise<{
    result: "success";
    workosTeamId: string;
    workosTeamName: string;
} | {
    result: "emailAlreadyUsed";
    message: string;
}>;
/**
 * Check if the WorkOS team associated with a Convex team is still accessible.
 * Returns null if the team is not provisioned or cannot be accessed.
 */
export declare function getWorkosTeamHealth(ctx: Context, teamId: number): Promise<components["schemas"]["WorkOSTeamHealthResponse"] | null>;
/**
 * Check if the WorkOS environment associated with a deployment is still accessible.
 * Returns null if the environment is not provisioned or cannot be accessed.
 */
export declare function getWorkosEnvironmentHealth(ctx: Context, deploymentName: string): Promise<components["schemas"]["WorkOSEnvironmentHealthResponse"] | null>;
export declare function disconnectWorkOSTeam(ctx: Context, teamId: number): Promise<{
    success: true;
    workosTeamId: string;
    workosTeamName: string;
} | {
    success: false;
    error: "not_associated" | "other";
    message: string;
}>;
export declare function inviteToWorkosTeam(ctx: Context, teamId: number, email: string): Promise<{
    result: "success";
    email: string;
    roleSlug: string;
} | {
    result: "teamNotProvisioned";
    message: string;
} | {
    result: "alreadyInWorkspace";
    message: string;
}>;
//# sourceMappingURL=platformApi.d.ts.map