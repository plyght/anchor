interface EscalationConfig {
  timeoutMinutes: number;
  maxEscalationCount: number;
}

export async function checkAndEscalateTasks(config?: EscalationConfig): Promise<{
  escalated: number;
  failed: number;
}> {
  console.warn('[ESCALATION] Escalation is handled by Convex cron jobs. This function is deprecated.');
  return { escalated: 0, failed: 0 };
}

export async function startEscalationMonitor(intervalMinutes: number = 1, config?: EscalationConfig): Promise<void> {
  console.log('[ESCALATION] Escalation monitoring is handled by Convex cron jobs (see convex/crons.ts)');
}
