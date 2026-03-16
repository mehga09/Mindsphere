import { prisma } from './backend/src/db';

async function test() {
  const contents = await prisma.content.findMany({
    where: { source: 'YouTube' },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  console.log(contents.map(c => ({ title: c.title, url: c.url, externalId: c.externalId })));
}
test().finally(() => process.exit(0));
