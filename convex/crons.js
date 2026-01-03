import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
const crons = cronJobs();
crons.interval("check and escalate tasks", { minutes: 1 }, internal.escalation.checkAndEscalateTasks, {});
export default crons;
