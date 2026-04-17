import type { PrismaClient as PrismaClientType } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClientType };

async function createPrismaClient(): Promise<PrismaClientType> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const [{ PrismaClient }, { PrismaPg }, { Pool }] = await Promise.all([
    import("@prisma/client"),
    import("@prisma/adapter-pg"),
    import("pg"),
  ]);

  const pool = new Pool({
    connectionString: url,
    max: 5,                    // Limit pool size for dev
    idleTimeoutMillis: 30000,
  });
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });

  // Pre-warm the pool so the first real query is fast
  await client.$executeRawUnsafe("SELECT 1");

  return client;
}

let clientPromise: Promise<PrismaClientType> | null = null;

export function getPrisma(): Promise<PrismaClientType> {
  if (globalForPrisma.__prisma) {
    return Promise.resolve(globalForPrisma.__prisma);
  }

  if (!clientPromise) {
    clientPromise = createPrismaClient().then((client) => {
      globalForPrisma.__prisma = client;
      return client;
    });
  }

  return clientPromise;
}
