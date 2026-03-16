import { PrismaClient, Role, ContentType, FlagStatus } from '@prisma/client';
import { hash } from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding ...');

  const password = await hash('password');

  // Create Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@mindsphere.io' },
    update: {},
    create: {
      email: 'admin@mindsphere.io',
      name: 'Admin User',
      password,
      role: Role.ADMIN,
    },
  });

  // Create Learner
  const learner = await prisma.user.upsert({
    where: { email: 'learner@example.com' },
    update: {},
    create: {
      email: 'learner@example.com',
      name: 'Jane Doe',
      password,
      role: Role.LEARNER,
      preferences: {
        create: {
          topics: ['Technology', 'Health', 'History'],
          dailyGoalMins: 30,
        },
      },
    },
  });

  // Create Tags
  const tags = ['Science', 'History', 'Wellness', 'Productivity', 'Tech'];
  const tagRecords = await Promise.all(
    tags.map((name) =>
      prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );

  // Create Content
  await prisma.content.create({
    data: {
      title: 'The History of the Internet',
      url: 'https://example.com/internet-history',
      type: ContentType.ARTICLE,
      duration: 300,
      tags: {
        create: {
          tag: { connect: { name: 'Tech' } },
        },
      },
    },
  });

  await prisma.content.create({
    data: {
      title: 'Meditation 101',
      url: 'https://example.com/meditation',
      type: ContentType.VIDEO,
      duration: 600,
      tags: {
        create: {
          tag: { connect: { name: 'Wellness' } },
        },
      },
    },
  });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
