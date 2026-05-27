import IORedis from "ioredis";
import { env } from "@/server/config/env";

const globalForRedis = globalThis as unknown as {
  redis?: IORedis;
};

export function getRedis() {
  if (!globalForRedis.redis) {
    const redis = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: false
    });

    redis.on("error", (error) => {
      if (process.env.NODE_ENV === "development") {
        console.warn("Redis connection error:", error.message);
      }
    });

    globalForRedis.redis = redis;
  }

  return globalForRedis.redis;
}

export function getBullMqConnection() {
  const url = new URL(env.REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0,
    connectTimeout: 1000,
    enableReadyCheck: false,
    maxRetriesPerRequest: null
  };
}
