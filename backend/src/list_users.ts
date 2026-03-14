import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: { _count: { select: { studyPlans: true } } }
  });
  
  console.log('--- ALL USERS ---');
  users.forEach(u => {
    console.log(`ID: ${u.id}, Email: ${u.email}, Plans: ${u._count.studyPlans}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
