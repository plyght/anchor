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
    const tasks = await convex.query(api.tasks.list, {
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
    const taskIds = await client.mutation(api.tasks.generateForIncident, {
      incident_id: incident_id as Id<'incidents'>,
    });

    const tasks = await Promise.all(
      taskIds.map((id) => client.query(api.tasks.get, { id }))
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

export default tasks;
