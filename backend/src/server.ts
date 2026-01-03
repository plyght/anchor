import { serve } from '@hono/node-server';
import { app } from './index.js';

const port = parseInt(process.env.PORT || '8000');
const hostname = '0.0.0.0';

console.log(`🚀 Server starting on http://${hostname}:${port}`);

serve({
  fetch: app.fetch,
  port,
  hostname,
});
