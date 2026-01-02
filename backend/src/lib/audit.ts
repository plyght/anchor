import { supabase } from './supabase';

export async function logAuditEvent(
  entityType: string,
  entityId: string,
  action: string,
  actor: string = 'system',
  details?: Record<string, any>
): Promise<void> {
  const { error } = await supabase
    .from('audit_log')
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      action,
      actor,
      details: details || {},
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Failed to create audit log:', error);
  }
}

export async function logVolunteerAction(
  volunteerId: string,
  action: string,
  details?: Record<string, any>
): Promise<void> {
  await logAuditEvent('volunteer', volunteerId, action, `volunteer:${volunteerId}`, details);
}

export async function logTaskAction(
  taskId: string,
  action: string,
  actor: string = 'system',
  details?: Record<string, any>
): Promise<void> {
  await logAuditEvent('task', taskId, action, actor, details);
}

export async function logIncidentAction(
  incidentId: string,
  action: string,
  actor: string = 'system',
  details?: Record<string, any>
): Promise<void> {
  await logAuditEvent('incident', incidentId, action, actor, details);
}

export async function getAuditLog(
  entityType?: string,
  entityId?: string,
  limit: number = 100
): Promise<any[]> {
  let query = supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (entityType) {
    query = query.eq('entity_type', entityType);
  }

  if (entityId) {
    query = query.eq('entity_id', entityId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch audit log:', error);
    return [];
  }

  return data || [];
}
