import { CronJob } from "cron";
import { mongo_client } from "./db.utils";
import { CronConfig } from "../interfaces/utils.interfaces";
import { Collection } from "mongodb";

const createCronJob = (config: CronConfig) => {
  const job = new CronJob(
    config.time,
    config.onTick ?? (() => {}),
    config.onComplete ?? undefined,
    config.start ?? false,
    config.time_zone
  );

  return job;
};

const persons: Collection = mongo_client.db().collection("persons")

const cleanStaleRecords = async () => {
  try {
    const result = await persons.deleteMany({
      hasPaid: { $ne: true },
      created_at: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // older than 24h
    });

    if (result.deletedCount && result.deletedCount > 0) {
      console.log(`[CRON CLEANUP] Deleted ${result.deletedCount} stale unverified records`);
    } else {
      console.log("[CRON CLEANUP] No stale unverified users found.");
    }
  } catch (err) {
    console.error("[CRON CLEANUP ERROR]", err);
  }
}

// Runs every day at midnight (00:00)
const cleanupUnverifiedUsersJob = createCronJob({
    time: "0 0 * * *",
    onTick: cleanStaleRecords
})

export {
    createCronJob,
    cleanupUnverifiedUsersJob
}