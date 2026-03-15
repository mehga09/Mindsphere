import { prisma } from './src/db';

async function checkSessions() {
    const plan = await prisma.studyPlan.findFirst({
        orderBy: { createdAt: 'desc' }
    });
    
    if (!plan) {
        console.log("No study plans found.");
        return;
    }
    
    console.log(`Checking plan: ${plan.id} for user ${plan.userId}`);
    
    const sessions = await prisma.studySession.findMany({
        where: { planId: plan.id },
        orderBy: { date: 'asc' },
        take: 30
    });
    
    console.log("Current Time (UTC):", new Date().toISOString());
    console.log("Current Time (Local):", new Date().toString());
    
    console.log("\nFound Sessions:");
    sessions.forEach(s => {
        console.log(`- ID: ${s.id}, Date (ISO): ${s.date.toISOString()}, Topic: ${s.topic}, Completed: ${s.isCompleted}`);
    });
}

checkSessions();
