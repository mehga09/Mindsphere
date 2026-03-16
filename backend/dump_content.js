
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const contents = await prisma.content.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' }
    });

    console.log('Last 10 Content Records:');
    contents.forEach(c => {
        console.log(`ID: ${c.id}, Title: ${c.title}, Duration: ${c.duration}s (${Math.floor(c.duration / 60)}m ${c.duration % 60}s)`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
