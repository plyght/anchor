import { convex, api } from './convex';
import type { Id } from '../../../convex/_generated/dataModel';

export async function matchTasksToVolunteers(incidentId: Id<'incidents'>): Promise<{
  assignments: Array<{
    task_id: Id<'tasks'>;
    volunteer_id: Id<'volunteers'>;
    score: number;
  }>;
  unmatched: Id<'tasks'>[];
}> {
  if (!convex) {
    throw new Error('Convex client not initialized');
  }

  const result = await convex.query(api.matching.matchTasksToVolunteers, {
    incident_id: incidentId,
  });

  return result;
}

export async function assignTaskToVolunteer(
  taskId: Id<'tasks'>,
  volunteerId: Id<'volunteers'>
): Promise<void> {
  if (!convex) {
    throw new Error('Convex client not initialized');
  }

  await convex.mutation(api.matching.assignTaskToVolunteer, {
    task_id: taskId,
    volunteer_id: volunteerId,
  });
}
