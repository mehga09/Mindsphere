import { prisma } from './db';

async function test() {
  const content = await prisma.content.findFirst({
    where: { source: 'YouTube' },
    orderBy: { createdAt: 'desc' }
  });
  console.log(content?.id);
}
test().finally(() => process.exit(0));
