import { prisma } from './src/db';

async function listAllSessionDates() {
    const plan = await prisma.studyPlan.findFirst({
        orderBy: { createdAt: 'desc' }
    });
    
    if (!plan) {
        console.log("No study plans found.");
        return;
    }
    
    console.log(`Plan ID: ${plan.id}, StartDate: ${plan.startDate.toISOString()}, EndDate: ${plan.endDate.toISOString()}`);
    
    const dates = await prisma.studySession.findMany({
        where: { planId: plan.id },
        select: { date: true },
        orderBy: { date: 'asc' }
    });
    
    console.log("\nScheduled session dates:");
    dates.forEach(d => {
        console.log(`- ${d.date.toISOString()}`);
    });
}

listAllSessionDates();
