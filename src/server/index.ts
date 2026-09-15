import { buildApp } from './app.js';

const app = buildApp();
const port = Number.parseInt(process.env.MOZARE_PORT ?? '5174', 10);

await app.listen({ host: '127.0.0.1', port: Number.isSafeInteger(port) ? port : 5174 });
