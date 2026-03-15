import { prisma } from './src/db';

async function checkTodaySessions() {
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log("Searching sessions between:");
    console.log("Start (ISO):", today.toISOString());
    console.log("End (ISO):", tomorrow.toISOString());

    const sessions = await prisma.studySession.findMany({
        where: {
            date: {
                gte: today,
                lt: tomorrow
            }
        },
        include: {
            plan: { select: { userId: true, topic: true } }
        }
    });

    console.log(`\nFound ${sessions.length} sessions for today across all plans.`);
    sessions.forEach(s => {
        console.log(`- User: ${s.plan.userId}, Plan Topic: ${s.plan.topic}, Session Topic: ${s.topic}, Date: ${s.date.toISOString()}`);
    });
}

checkTodaySessions();
