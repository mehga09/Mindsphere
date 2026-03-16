import { prisma } from './db';

async function test() {
    try {
        console.log("Checking Prisma Models...");
        const themeCount = await (prisma as any).theme.count();
        console.log("Theme model exists. Count:", themeCount);
        
        const user = await prisma.user.findFirst({ select: { activeThemeId: true } });
        console.log("User activeThemeId exists.");
        
        console.log("Prisma Client is Up to Date!");
    } catch (err) {
        console.error("Prisma Client NOT updated:", err);
    }
}

test().finally(() => process.exit(0));
