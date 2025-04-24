import { PrismaClient } from "@prisma/client";

export const getPrisma = (database_url: string) => {
  return new PrismaClient({
    datasourceUrl: database_url,
  })
}