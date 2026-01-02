import { convex, api } from './convex.js';
import type { Id } from '../../../convex/_generated/dataModel';

export async function logAuditEvent(
  entityType: 'volunteer' | 'incident' | 'task' | 'assignment' | 'system',
  entityId: string,
  action: string,
  actor: string = 'system',
  details?: Record<string, any>
): Promise<void> {
  if (!convex) {
    console.error('Convex client not initialized');
    return;
  }

  try {
    await convex.mutation(api.audit.logAuditEvent, {
      entity_type: entityType,
      entity_id: entityId,
      action,
      actor,
      details: details || {},
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

export async function logVolunteerAction(
  volunteerId: Id<'volunteers'>,
  action: string,
  details?: Record<string, any>
): Promise<void> {
  if (!convex) {
    console.error('Convex client not initialized');
    return;
  }

  try {
    await convex.mutation(api.audit.logVolunteerAction, {
      volunteer_id: volunteerId,
      action,
      details: details || {},
    });
  } catch (error) {
    console.error('Failed to log volunteer action:', error);
  }
}

export async function logTaskAction(
  taskId: Id<'tasks'>,
  action: string,
  actor: string = 'system',
  details?: Record<string, any>
): Promise<void> {
  if (!convex) {
    console.error('Convex client not initialized');
    return;
  }

  try {
    await convex.mutation(api.audit.logTaskAction, {
      task_id: taskId,
      action,
      actor,
      details: details || {},
    });
  } catch (error) {
    console.error('Failed to log task action:', error);
  }
}

export async function logIncidentAction(
  incidentId: Id<'incidents'>,
  action: string,
  actor: string = 'system',
  details?: Record<string, any>
): Promise<void> {
  if (!convex) {
    console.error('Convex client not initialized');
    return;
  }

  try {
    await convex.mutation(api.audit.logIncidentAction, {
      incident_id: incidentId,
      action,
      actor,
      details: details || {},
    });
  } catch (error) {
    console.error('Failed to log incident action:', error);
  }
}

export async function getAuditLog(
  entityType?: 'volunteer' | 'incident' | 'task' | 'assignment' | 'system',
  entityId?: string,
  limit: number = 100
): Promise<any[]> {
  if (!convex) {
    console.error('Convex client not initialized');
    return [];
  }

  try {
    return await convex.query(api.audit.getAuditLog, {
      entity_type: entityType,
      entity_id: entityId,
      limit,
    });
  } catch (error) {
    console.error('Failed to fetch audit log:', error);
    return [];
  }
}
