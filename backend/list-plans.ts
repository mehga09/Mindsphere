import { prisma } from './src/db';

async function listPlans() {
    const plans = await prisma.studyPlan.findMany({
        include: {
            user: { select: { email: true } },
            _count: { select: { sessions: true, tasks: true } }
        }
    });
    
    console.log("Study Plans in DB:");
    plans.forEach(p => {
        console.log(`- PlanID: ${p.id}, User: ${p.user.email} (${p.userId}), Topic: ${p.topic}, Sessions: ${p._count.sessions}, Tasks: ${p._count.tasks}`);
    });
}

listPlans();
