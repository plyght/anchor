import { serve } from '@hono/node-server';
import { app } from './index.js';

const port = parseInt(process.env.PORT || '3000');
const hostname = process.env.HOSTNAME || '0.0.0.0';

console.log(`🚀 Server starting on http://${hostname}:${port}`);

serve({
  fetch: app.fetch,
  port,
  hostname,
});
