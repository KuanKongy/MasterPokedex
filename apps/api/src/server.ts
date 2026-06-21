import { serve } from '@hono/node-server';
import app from './index';
import { env } from './env';

const { PORT } = env();

const server = serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`[api] listening on http://localhost:${info.port}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    console.log(`[api] ${signal} received, draining`);
    server.close(() => process.exit(0));
  });
}
