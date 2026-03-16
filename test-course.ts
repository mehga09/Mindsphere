import { prisma } from './backend/src/db';
import { CoursePlanService } from './backend/src/services/coursePlan.service';

async function test() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log("No user found");
    return;
  }
  const svc = new CoursePlanService();
  try {
    const res = await svc.startCourse(user.id, 'React Native');
    console.log("SUCCESS:", res);
  } catch (e) {
    console.error("FAILED:", e);
  }
}
test().finally(() => process.exit(0));
