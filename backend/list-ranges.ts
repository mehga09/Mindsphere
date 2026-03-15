import { prisma } from './src/db';

async function listPlanRanges() {
    const plans = await prisma.studyPlan.findMany({
        select: {
            id: true,
            topic: true,
            startDate: true,
            endDate: true,
            createdAt: true
        },
        orderBy: { createdAt: 'desc' }
    });
    
    console.log("Study Plan Ranges:");
    plans.forEach(p => {
        console.log(`- Topic: ${p.topic}, Start: ${p.startDate.toISOString()}, End: ${p.endDate.toISOString()}, Created: ${p.createdAt.toISOString()}`);
    });
}

listPlanRanges();
