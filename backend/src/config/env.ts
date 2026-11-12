import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const envSchema = z.object({
  PORT: z
    .string()
    .default("5000")
    .transform((val) => parseInt(val, 10)),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  AI_PROVIDER: z
    .enum(["mock", "gemini", "groq", "kimi", "openrouter"])
    .default("mock"),
  GEMINI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  KIMI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),
  MONGODB_URI: z.string().default("mongodb://localhost:27017/loga-kimi"),
  CREDENTIAL_ENCRYPTION_KEY: z
    .union([z.literal(""), z.string().regex(/^[a-f0-9]{64}$/i)])
    .optional(),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid environment variables:", parsedEnv.error.format());
  process.exit(1);
}

export const config = parsedEnv.data;
