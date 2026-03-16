import { prisma } from './db';
import * as fs from 'fs';

async function test() {
  const contents = await prisma.content.findMany({
    where: { source: 'YouTube' },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  fs.writeFileSync('output.json', JSON.stringify(contents.map(c => ({ title: c.title, url: c.url, externalId: c.externalId })), null, 2));
}
test().finally(() => process.exit(0));
