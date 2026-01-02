import { Hono } from 'hono';
import { convex, api } from '../lib/convex';
import type { Id } from '../../../convex/_generated/dataModel';

const incidents = new Hono();

incidents.get('/', async (c) => {
  if (!convex) {
    return c.json({ error: 'Convex client not initialized' }, 500);
  }

  try {
    const incidents = await convex.query(api.incidents.list, {});
    return c.json({ incidents });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: message }, 500);
  }
});

incidents.get('/:id', async (c) => {
  if (!convex) {
    return c.json({ error: 'Convex client not initialized' }, 500);
  }

  const id = c.req.param('id') as Id<'incidents'>;

  try {
    const incident = await convex.query(api.incidents.get, { id });

    if (!incident) {
      return c.json({ error: 'Incident not found' }, 404);
    }

    const tasks = await convex.query(api.tasks.list, {
      incident_id: id,
    });

    return c.json({ incident: { ...incident, tasks } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: message }, 404);
  }
});

incidents.post('/', async (c) => {
  if (!convex) {
    return c.json({ error: 'Convex client not initialized' }, 500);
  }

  const body = await c.req.json();

  try {
    const incidentId = await convex.mutation(api.incidents.create, body);
    const incident = await convex.query(api.incidents.get, { id: incidentId });

    return c.json({ incident }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: message }, 400);
  }
});

export default incidents;
