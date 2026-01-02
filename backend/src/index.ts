import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import volunteers from './routes/volunteers';
import incidents from './routes/incidents';
import tasks from './routes/tasks';
import matching from './routes/matching';
import { startEscalationMonitor } from './lib/escalation';

const app = new Hono();

app.use('*', logger());
app.use('*', cors());

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.route('/api/volunteers', volunteers);
app.route('/api/incidents', incidents);
app.route('/api/tasks', tasks);
app.route('/api/matching', matching);

startEscalationMonitor(1, { timeoutMinutes: 5, maxEscalationCount: 3 });

export { app };

if (typeof Bun !== 'undefined') {
  const port = parseInt(process.env.PORT || '3000');
  console.log(`🚀 Server starting on http://localhost:${port}`);
  const server = {
    port,
    fetch: app.fetch,
  };
  (globalThis as any).__bunServer = server;
}
