import { PrismaClient } from "@prisma/client"

/**
 * Instance of Prisma Client for database operations.
 * 
 * @example
 * // Usage example:
 * const tableData = await prisma.tableName.findMany();
 */
const prisma = new PrismaClient();

export default prisma;
