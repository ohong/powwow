import { createClient, RedisClientType } from "redis";
import { env } from "./env";

const globalForRedis = globalThis as unknown as {
  redisClient?: RedisClientType;
  redisClientPromise?: Promise<RedisClientType>;
};

const createRedisClient = () => {
  const client = createClient({ url: env.redisUrl });
  client.on("error", (err) => {
    console.error("Redis client error", err);
  });
  return client;
};

export const getRedisClient = async (): Promise<RedisClientType> => {
  if (globalForRedis.redisClient) {
    return globalForRedis.redisClient;
  }

  if (!globalForRedis.redisClientPromise) {
    const client = createRedisClient();
    globalForRedis.redisClientPromise = client.connect().then(() => {
      globalForRedis.redisClient = client;
      return client;
    });
  }

  return globalForRedis.redisClientPromise;
};

export const cacheJson = async <T>(key: string, value: T, ttlSeconds?: number) => {
  const client = await getRedisClient();
  const payload = JSON.stringify(value);
  if (ttlSeconds) {
    await client.set(key, payload, { EX: ttlSeconds });
  } else {
    await client.set(key, payload);
  }
};

export const readJson = async <T>(key: string): Promise<T | null> => {
  const client = await getRedisClient();
  const payload = await client.get(key);
  if (!payload) {
    return null;
  }
  try {
    return JSON.parse(payload) as T;
  } catch (error) {
    console.error(`Failed to parse JSON for key ${key}`, error);
    return null;
  }
};

export const cacheString = async (key: string, value: string, ttlSeconds?: number) => {
  const client = await getRedisClient();
  if (ttlSeconds) {
    await client.set(key, value, { EX: ttlSeconds });
  } else {
    await client.set(key, value);
  }
};

export const readString = async (key: string): Promise<string | null> => {
  const client = await getRedisClient();
  return client.get(key);
};

export const removeKey = async (key: string) => {
  const client = await getRedisClient();
  await client.del(key);
};
