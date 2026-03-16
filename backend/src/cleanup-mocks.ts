import { prisma } from './db';

async function cleanup() {
  const result = await prisma.content.deleteMany({
    where: { externalId: { startsWith: 'mock_' } }
  });
  console.log(`Deleted ${result.count} mock videos from database.`);
}
cleanup().finally(() => process.exit(0));
