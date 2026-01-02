import { Hono } from 'hono';
import { supabase } from '../lib/supabase';
import type { Volunteer } from '../types';

const volunteers = new Hono();

volunteers.get('/', async (c) => {
  const { data, error } = await supabase
    .from('volunteers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ volunteers: data });
});

volunteers.get('/:id', async (c) => {
  const id = c.req.param('id');
  
  const { data, error } = await supabase
    .from('volunteers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return c.json({ error: error.message }, 404);
  }

  return c.json({ volunteer: data });
});

volunteers.post('/', async (c) => {
  const body = await c.req.json();
  
  const { data, error } = await supabase
    .from('volunteers')
    .insert(body)
    .select()
    .single();

  if (error) {
    return c.json({ error: error.message }, 400);
  }

  return c.json({ volunteer: data }, 201);
});

volunteers.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  
  const { data, error } = await supabase
    .from('volunteers')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return c.json({ error: error.message }, 400);
  }

  return c.json({ volunteer: data });
});

export default volunteers;
