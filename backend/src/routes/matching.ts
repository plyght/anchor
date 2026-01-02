import { Hono } from 'hono';
import { convex, api } from '../lib/convex.js';
import type { Id } from '../../../convex/_generated/dataModel';

const matching = new Hono();

matching.post('/incidents/:incidentId/match', async (c) => {
  if (!convex) {
    return c.json({ error: 'Convex client not initialized' }, 500);
  }

  const incidentId = c.req.param('incidentId') as Id<'incidents'>;

  try {
    const result = await convex.mutation(api.matching.matchIncident, {
      incident_id: incidentId,
    });

    return c.json({
      success: true,
      matched: result.matched,
      unmatched: result.unmatched,
      assignments: result.assignments,
      unmatched_task_ids: result.unmatched_task_ids,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: message }, 500);
  }
});

matching.post('/tasks/:taskId/assign/:volunteerId', async (c) => {
  if (!convex) {
    return c.json({ error: 'Convex client not initialized' }, 500);
  }

  const taskId = c.req.param('taskId') as Id<'tasks'>;
  const volunteerId = c.req.param('volunteerId') as Id<'volunteers'>;

  try {
    await convex.mutation(api.matching.assignTaskToVolunteer, {
      task_id: taskId,
      volunteer_id: volunteerId,
    });

    return c.json({ success: true, task_id: taskId, volunteer_id: volunteerId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: message }, 500);
  }
});

export default matching;
