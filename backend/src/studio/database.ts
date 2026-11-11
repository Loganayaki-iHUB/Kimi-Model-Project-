import { MongoClient, Db } from "mongodb";
import { config } from "../config/env";
import { Project, Settings } from "./types";

let db: Db;
export const client = new MongoClient(config.MONGODB_URI, {
  family: 4,
  serverSelectionTimeoutMS: 5000,
});
export const projects = () => db.collection<Project>("projects");
export const settings = () => db.collection<Settings>("settings");
export async function connectDatabase() {
  await client.connect();
  db = client.db();
  await db
    .collection("users")
    .updateOne(
      { userId: "loga" },
      { $setOnInsert: { userId: "loga", name: "loga", createdAt: new Date() } },
      { upsert: true },
    );
  await projects().createIndex({ userId: 1, updatedAt: -1 });
  // A process restart interrupts in-flight work. Preserve completed files and enable retry.
  await projects().updateMany(
    { busy: true },
    {
      $set: {
        busy: false,
        stage: "failed",
        error:
          "The server restarted during this operation. Your saved work is safe; please retry.",
      },
    },
  );
}
export async function databaseHealthy() {
  try {
    await db.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}
