import dns from "dns";
import { createApp } from "./app";
import { config } from "./config/env";
import { client, connectDatabase } from "./studio/database";

// Force Node.js to prefer IPv4 over IPv6 to fix Windows ConnectTimeoutError
try {
  dns.setDefaultResultOrder("ipv4first");
} catch (e) {
  // Ignore on older runtimes
}

async function start() {
  await connectDatabase();
  const server = createApp().listen(config.PORT, "127.0.0.1", () => {
    console.log(
      `[Loga Studio] http://localhost:${config.PORT} · MongoDB connected`,
    );
  });
  const shutdown = () => {
    server.close(() => {
      void client.close().then(() => process.exit(0));
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
void start().catch((error: Error) => {
  console.error(`[Loga Studio] Startup failed: ${error.message}`);
  process.exit(1);
});
