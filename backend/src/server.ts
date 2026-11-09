import { createApp } from './app';
import { config } from './config/env';

const app = createApp();

app.listen(config.PORT, () => {
  console.log(`[Backend] Server listening on port ${config.PORT}`);
  console.log(`[Backend] Active AI Provider: ${config.AI_PROVIDER}`);
  console.log(`[Backend] Health check: http://localhost:${config.PORT}/api/generation/health`);
});

