import { supabase } from './supabase';
import { matchTasksToVolunteers, assignTaskToVolunteer } from './matching';

interface EscalationConfig {
  timeoutMinutes: number;
  maxEscalationCount: number;
}

const DEFAULT_CONFIG: EscalationConfig = {
  timeoutMinutes: 5,
  maxEscalationCount: 3,
};

export async function checkAndEscalateTasks(config: EscalationConfig = DEFAULT_CONFIG): Promise<{
  escalated: number;
  failed: number;
}> {
  const timeoutThreshold = new Date();
  timeoutThreshold.setMinutes(timeoutThreshold.getMinutes() - config.timeoutMinutes);

  const { data: timedOutTasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'dispatched')
    .lt('dispatched_at', timeoutThreshold.toISOString())
    .lt('escalation_count', config.maxEscalationCount);

  if (error || !timedOutTasks) {
    console.error('Failed to fetch timed out tasks:', error);
    return { escalated: 0, failed: 0 };
  }

  let escalated = 0;
  let failed = 0;

  for (const task of timedOutTasks) {
    try {
      await escalateTask(task.id, task.incident_id, task.escalation_count);
      escalated++;
    } catch (error) {
      console.error(`Failed to escalate task ${task.id}:`, error);
      failed++;
    }
  }

  return { escalated, failed };
}

async function escalateTask(taskId: string, incidentId: string, currentEscalationCount: number): Promise<void> {
  const newEscalationCount = currentEscalationCount + 1;

  const { error: updateError } = await supabase
    .from('tasks')
    .update({
      status: 'pending',
      escalation_count: newEscalationCount,
      assigned_volunteer_id: null,
      dispatched_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId);

  if (updateError) {
    throw new Error(`Failed to reset task status: ${updateError.message}`);
  }

  const { error: assignmentUpdateError } = await supabase
    .from('task_assignments')
    .update({ status: 'timeout' })
    .eq('task_id', taskId)
    .eq('status', 'sent');

  if (assignmentUpdateError) {
    console.error('Failed to update assignment status:', assignmentUpdateError);
  }

  const { error: auditError } = await supabase
    .from('audit_log')
    .insert({
      entity_type: 'task',
      entity_id: taskId,
      action: 'escalated',
      actor: 'system',
      details: {
        escalation_count: newEscalationCount,
        reason: 'timeout',
      },
    });

  if (auditError) {
    console.error('Failed to create escalation audit log:', auditError);
  }

  try {
    const { assignments } = await matchTasksToVolunteers(incidentId);
    const assignment = assignments.find(a => a.task_id === taskId);
    
    if (assignment) {
      await assignTaskToVolunteer(assignment.task_id, assignment.volunteer_id);
    } else {
      const { error: escalatedError } = await supabase
        .from('tasks')
        .update({ status: 'escalated' })
        .eq('id', taskId);
      
      if (escalatedError) {
        console.error('Failed to mark task as escalated:', escalatedError);
      }
    }
  } catch (error) {
    console.error('Failed to reassign escalated task:', error);
    throw error;
  }
}

export async function startEscalationMonitor(intervalMinutes: number = 1, config?: EscalationConfig): Promise<void> {
  const intervalMs = intervalMinutes * 60 * 1000;
  
  setInterval(async () => {
    const result = await checkAndEscalateTasks(config);
    if (result.escalated > 0 || result.failed > 0) {
      console.log(`[ESCALATION] Escalated: ${result.escalated}, Failed: ${result.failed}`);
    }
  }, intervalMs);

  console.log(`[ESCALATION] Monitor started (checking every ${intervalMinutes} minute(s))`);
}
