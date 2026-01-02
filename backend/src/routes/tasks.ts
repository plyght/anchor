import { Hono } from 'hono';
import { supabase } from '../lib/supabase';
import type { Task } from '../types';

const tasks = new Hono();

function generateAcceptanceCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

tasks.get('/', async (c) => {
  const status = c.req.query('status');
  const incident_id = c.req.query('incident_id');
  
  let query = supabase
    .from('tasks')
    .select('*, volunteers(*), incidents(*)');

  if (status) {
    query = query.eq('status', status);
  }
  
  if (incident_id) {
    query = query.eq('incident_id', incident_id);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ tasks: data });
});

tasks.post('/generate', async (c) => {
  const { incident_id } = await c.req.json();
  
  const floodTasks = [
    {
      title: 'Check levee integrity',
      description: 'Inspect levee for cracks and structural damage',
      task_type: 'inspection',
      priority: 'urgent',
      required_skills: ['inspection', 'engineering'],
    },
    {
      title: 'Assess property damage',
      description: 'Document water damage to residential properties',
      task_type: 'inspection',
      priority: 'high',
      required_skills: ['inspection', 'documentation'],
    },
    {
      title: 'Distribute sandbags',
      description: 'Deliver and place sandbags at critical locations',
      task_type: 'delivery',
      priority: 'high',
      required_skills: ['heavy_lifting', 'driving'],
    },
    {
      title: 'Document water levels',
      description: 'Take photos and measurements of current water levels',
      task_type: 'report',
      priority: 'medium',
      required_skills: ['documentation'],
    },
  ];

  const tasksToInsert = floodTasks.map(task => ({
    ...task,
    incident_id,
    acceptance_code: generateAcceptanceCode(),
    status: 'pending',
    escalation_count: 0,
  }));

  const { data, error } = await supabase
    .from('tasks')
    .insert(tasksToInsert)
    .select();

  if (error) {
    return c.json({ error: error.message }, 400);
  }

  return c.json({ tasks: data }, 201);
});

tasks.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  
  const { data, error } = await supabase
    .from('tasks')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return c.json({ error: error.message }, 400);
  }

  return c.json({ task: data });
});

export default tasks;
