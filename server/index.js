// Root entry point for Vercel Express framework auto-detection
import app, { server, roomManager } from './dist/index.js';

export default app;
export { app, server, roomManager };
