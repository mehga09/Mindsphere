import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();
  const planCount = await prisma.studyPlan.count();
  const sessionCount = await prisma.studySession.count();
  
  console.log('--- DB STATS ---');
  console.log('Users:', userCount);
  console.log('Plans:', planCount);
  console.log('Sessions:', sessionCount);
  
  const lastPlan = await prisma.studyPlan.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { user: true }
  });
  
  if (lastPlan) {
    console.log('--- LAST PLAN ---');
    console.log('ID:', lastPlan.id);
    console.log('Topic:', lastPlan.topic);
    console.log('User Email:', lastPlan.user.email);
    console.log('User ID:', lastPlan.userId);
    console.log('Created At:', lastPlan.createdAt);
  } else {
    console.log('No plans found in DB.');
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
