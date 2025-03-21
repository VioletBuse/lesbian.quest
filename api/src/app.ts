import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import creatorsRouter from './routes/creators/index';
import type { Env } from './types';

// Create the app
const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('*', cors());
app.use('*', prettyJSON());

// Health check
app.get('/', (c) => c.json({ status: 'ok' }));

// Routes
app.route('/api/creators', creatorsRouter);

// Error handling
app.onError((err, c) => {
    console.error(`${err}`);
    return c.json({ error: 'Internal Server Error' }, 500);
});

export default app; 