import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const plans = await prisma.studyPlan.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { user: { select: { email: true } } }
  });
  
  console.log('--- RECENT PLANS ---');
  plans.forEach(p => {
    console.log(`ID: ${p.id}, User: ${p.user.email}, Topic: ${p.topic}, Created: ${p.createdAt}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
