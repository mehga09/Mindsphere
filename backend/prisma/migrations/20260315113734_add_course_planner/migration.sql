-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED');

-- AlterTable
ALTER TABLE "DailyPlan" ADD COLUMN     "coursePlanId" TEXT;

-- AlterTable
ALTER TABLE "LearningSession" ADD COLUMN     "dailyTaskId" TEXT;

-- CreateTable
CREATE TABLE "CoursePlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL DEFAULT 1,
    "status" "CourseStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoursePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseTopicNode" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "topicName" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "isMastered" BOOLEAN NOT NULL DEFAULT false,
    "isUnlocked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CourseTopicNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyPerformance" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "topicNodeId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgQuizScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tasksTotal" INTEGER NOT NULL DEFAULT 0,
    "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoursePlan_userId_idx" ON "CoursePlan"("userId");

-- CreateIndex
CREATE INDEX "CoursePlan_userId_status_idx" ON "CoursePlan"("userId", "status");

-- CreateIndex
CREATE INDEX "CourseTopicNode_courseId_orderIndex_idx" ON "CourseTopicNode"("courseId", "orderIndex");

-- CreateIndex
CREATE INDEX "DailyPerformance_courseId_idx" ON "DailyPerformance"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyPerformance_courseId_dayNumber_key" ON "DailyPerformance"("courseId", "dayNumber");

-- AddForeignKey
ALTER TABLE "LearningSession" ADD CONSTRAINT "LearningSession_dailyTaskId_fkey" FOREIGN KEY ("dailyTaskId") REFERENCES "DailyTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyPlan" ADD CONSTRAINT "DailyPlan_coursePlanId_fkey" FOREIGN KEY ("coursePlanId") REFERENCES "CoursePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoursePlan" ADD CONSTRAINT "CoursePlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseTopicNode" ADD CONSTRAINT "CourseTopicNode_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "CoursePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyPerformance" ADD CONSTRAINT "DailyPerformance_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "CoursePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyPerformance" ADD CONSTRAINT "DailyPerformance_topicNodeId_fkey" FOREIGN KEY ("topicNodeId") REFERENCES "CourseTopicNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
