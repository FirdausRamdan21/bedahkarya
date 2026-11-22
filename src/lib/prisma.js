import { PrismaClient } from "@/generated/prisma-v3";

const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prismaV3 ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaV3 = prisma;
}

export default prisma;
