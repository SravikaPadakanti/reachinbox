const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const user = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        googleId: null,
        avatarUrl: null
      }
    });
    console.log('✅ User created/updated:', user.id);
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
})();
