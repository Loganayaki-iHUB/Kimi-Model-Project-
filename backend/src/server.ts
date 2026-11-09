import dns from 'dns';
import { createApp } from './app';
import { config } from './config/env';

// Force Node.js to prefer IPv4 over IPv6 to fix Windows ConnectTimeoutError
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {
  // Ignore on older runtimes
}

const app = createApp();

app.listen(config.PORT, () => {
  console.log(`[Backend] Server listening on port ${config.PORT}`);
  console.log(`[Backend] Active AI Provider: ${config.AI_PROVIDER}`);
  console.log(`[Backend] Health check: http://localhost:${config.PORT}/api/generation/health`);
});

