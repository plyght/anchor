import { Hono } from 'hono';
import { supabase } from '../lib/supabase';
import type { Incident } from '../types';

const incidents = new Hono();

incidents.get('/', async (c) => {
  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ incidents: data });
});

incidents.get('/:id', async (c) => {
  const id = c.req.param('id');
  
  const { data, error } = await supabase
    .from('incidents')
    .select('*, tasks(*)')
    .eq('id', id)
    .single();

  if (error) {
    return c.json({ error: error.message }, 404);
  }

  return c.json({ incident: data });
});

incidents.post('/', async (c) => {
  const body = await c.req.json();
  
  const { data, error } = await supabase
    .from('incidents')
    .insert(body)
    .select()
    .single();

  if (error) {
    return c.json({ error: error.message }, 400);
  }

  return c.json({ incident: data }, 201);
});

export default incidents;
