import { Hono } from 'hono';
import { convex, api } from '../lib/convex.js';
import type { Id } from '../../../convex/_generated/dataModel';

const volunteers = new Hono();

volunteers.get('/', async (c) => {
  if (!convex) {
    return c.json({ error: 'Convex client not initialized' }, 500);
  }

  try {
    const volunteers = await convex.query(api.volunteers.list, {});
    return c.json({ volunteers });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: message }, 500);
  }
});

volunteers.get('/:id', async (c) => {
  if (!convex) {
    return c.json({ error: 'Convex client not initialized' }, 500);
  }

  const id = c.req.param('id') as Id<'volunteers'>;

  try {
    const volunteer = await convex.query(api.volunteers.get, { id });

    if (!volunteer) {
      return c.json({ error: 'Volunteer not found' }, 404);
    }

    return c.json({ volunteer });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: message }, 404);
  }
});

volunteers.post('/', async (c) => {
  if (!convex) {
    return c.json({ error: 'Convex client not initialized' }, 500);
  }

  const body = await c.req.json();

  try {
    const volunteerId = await convex.mutation(api.volunteers.create, body);
    const volunteer = await convex.query(api.volunteers.get, { id: volunteerId });

    return c.json({ volunteer }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: message }, 400);
  }
});

volunteers.patch('/:id', async (c) => {
  if (!convex) {
    return c.json({ error: 'Convex client not initialized' }, 500);
  }

  const id = c.req.param('id') as Id<'volunteers'>;
  const body = await c.req.json();

  try {
    await convex.mutation(api.volunteers.update, {
      id,
      ...body,
    });

    const volunteer = await convex.query(api.volunteers.get, { id });
    return c.json({ volunteer });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: message }, 400);
  }
});

export default volunteers;
