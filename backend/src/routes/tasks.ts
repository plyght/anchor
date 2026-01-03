import { Hono } from 'hono';
import { convex, api } from '../lib/convex.js';
import type { Id } from '../../../convex/_generated/dataModel';

const tasks = new Hono();

tasks.get('/', async (c) => {
  if (!convex) {
    return c.json({ error: 'Convex client not initialized' }, 500);
  }

  const status = c.req.query('status') as
    | 'pending'
    | 'dispatched'
    | 'accepted'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
    | 'failed'
    | undefined;
  const incident_id = c.req.query('incident_id') as Id<'incidents'> | undefined;

  try {
    const tasks = await convex.query(api.tasks.listWithVolunteers, {
      status,
      incident_id,
    });
    return c.json({ tasks });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: message }, 500);
  }
});

tasks.post('/generate', async (c) => {
  if (!convex) {
    return c.json({ error: 'Convex client not initialized' }, 500);
  }

  const { incident_id } = await c.req.json();

  if (!incident_id) {
    return c.json({ error: 'incident_id is required' }, 400);
  }

  const client = convex;

  try {
    const taskIds = await client.action(api.tasks.generateForIncident, {
      incident_id: incident_id as Id<'incidents'>,
    });

    const tasks = await Promise.all(
      taskIds.map((taskId: Id<'tasks'>) => client.query(api.tasks.get, { id: taskId }))
    );

    return c.json({ tasks: tasks.filter((t) => t !== null) }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: message }, 400);
  }
});

tasks.patch('/:id', async (c) => {
  if (!convex) {
    return c.json({ error: 'Convex client not initialized' }, 500);
  }

  const id = c.req.param('id') as Id<'tasks'>;
  const body = await c.req.json();

  try {
    await convex.mutation(api.tasks.update, {
      id,
      ...body,
    });

    const task = await convex.query(api.tasks.get, { id });
    return c.json({ task });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: message }, 400);
  }
});

tasks.post('/:acceptance_code/respond', async (c) => {
  if (!convex) {
    return c.json({ error: 'Convex client not initialized' }, 500);
  }

  const acceptance_code = c.req.param('acceptance_code');
  const body = await c.req.json();

  try {
    const allTasks = await convex.query(api.tasks.listWithVolunteers, {});
    const task = allTasks.find((t: any) => t.acceptance_code === acceptance_code);

    if (!task) {
      return c.json({ error: 'Task not found' }, 404);
    }

    if (task.target_volunteer_bitchat_username && task.assigned_volunteer_id) {
      const allVolunteers = await convex.query(api.volunteers.list, {});
      const respondingVolunteer = allVolunteers.find((v: any) => 
        v.bitchat_username === body.volunteer_id || 
        v._id === body.volunteer_id
      );
      
      if (!respondingVolunteer || respondingVolunteer._id !== task.assigned_volunteer_id) {
        return c.json({ 
          error: 'This task is assigned to someone else',
          assigned_only: true 
        }, 403);
      }
    }

    const action = body.action?.toUpperCase();
    let newStatus: 'accepted' | 'in_progress' | 'completed' | 'pending' = 'accepted';

    if (action === 'A' || action === 'ACCEPT') {
      newStatus = 'accepted';
    } else if (action === 'D' || action === 'DECLINE') {
      newStatus = 'pending';
    } else if (action === 'DONE' || action === 'COMPLETE') {
      newStatus = 'completed';
    }

    await convex.mutation(api.tasks.update, {
      id: task._id,
      status: newStatus,
      accepted_at: newStatus === 'accepted' ? Date.now() : undefined,
      completed_at: newStatus === 'completed' ? Date.now() : undefined,
    });

    return c.json({ 
      success: true, 
      task_id: task._id,
      status: newStatus 
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: message }, 400);
  }
});

export default tasks;
