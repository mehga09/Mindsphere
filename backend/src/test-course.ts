import { prisma } from './db';
import { CoursePlanService } from './services/coursePlan.service';

async function test() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log("No user found");
    return;
  }
  const svc = new CoursePlanService();
  try {
    const res = await svc.startCourse(user.id, 'React Native');
    console.dir(res, { depth: null });
  } catch (e: any) {
    console.error("FAILED START COURSE:", e.stack || e);
  }
}
test().finally(() => process.exit(0));
