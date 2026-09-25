const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // First check if user exists
    const existing = await prisma.user.findUnique({
      where: { id: 'test-user-123' }
    });
    
    if (existing) {
      console.log('✅ User already exists:', existing.id, existing.email);
    } else {
      // Create new user
      const user = await prisma.user.create({
        data: {
          id: 'test-user-123',
          email: 'testuser@example.com',
          name: 'Test User',
          googleId: null
        }
      });
      console.log('✅ User created:', user.id, user.email);
    }
    
    // List all users
    const allUsers = await prisma.user.findMany();
    console.log('📊 Total users in DB:', allUsers.length);
    allUsers.forEach(u => console.log('   -', u.id, u.email));
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
})();
