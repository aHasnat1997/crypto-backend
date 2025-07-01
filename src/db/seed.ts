import bcrypt from 'bcrypt';
import config from '../config';
import prisma from '.';

/**
 * Function to initialize the application with a super admin user.
 * Hashes the super admin password using bcrypt, creates or updates the super admin user,
 * and their associated profile using Prisma.
 * 
 * @returns {Promise<void>}
 */
(async function main() {
  try {
    // Hash the super admin password
    const hashedPassword = await bcrypt.hash(config.SUPER_ADMIN.PASS!, Number(config.BCRYPT_SALT_ROUNDS));

    // Use Prisma transaction to create or update super admin user and profile
    const user = await prisma.users.upsert({
      where: {
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: ''
      },
      update: {},
      create: {
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: ''
      }
    });

    // Disconnect Prisma client after successful initialization
    await prisma.$disconnect();
  } catch (e) {
    console.error(e);
    // Disconnect Prisma client and exit process on error
    await prisma.$disconnect();
    process.exit(1);
  }
})();
