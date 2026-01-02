import { Hono } from 'hono';
import { matchTasksToVolunteers, assignTaskToVolunteer } from '../lib/matching';

const matching = new Hono();

matching.post('/incidents/:incidentId/match', async (c) => {
  const incidentId = c.req.param('incidentId');
  
  try {
    const { assignments, unmatched } = await matchTasksToVolunteers(incidentId);
    
    for (const assignment of assignments) {
      await assignTaskToVolunteer(assignment.task_id, assignment.volunteer_id);
    }
    
    return c.json({
      success: true,
      matched: assignments.length,
      unmatched: unmatched.length,
      assignments: assignments.map(a => ({
        task_id: a.task_id,
        volunteer_id: a.volunteer_id,
        match_score: a.score,
      })),
      unmatched_task_ids: unmatched,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: message }, 500);
  }
});

matching.post('/tasks/:taskId/assign/:volunteerId', async (c) => {
  const taskId = c.req.param('taskId');
  const volunteerId = c.req.param('volunteerId');
  
  try {
    await assignTaskToVolunteer(taskId, volunteerId);
    return c.json({ success: true, task_id: taskId, volunteer_id: volunteerId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: message }, 500);
  }
});

export default matching;
