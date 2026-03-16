/*
  Warnings:

  - Added the required column `dayNumber` to the `StudySession` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "StudySession" ADD COLUMN     "dayNumber" INTEGER NOT NULL,
ADD COLUMN     "isPractice" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sessionTime" TEXT,
ADD COLUMN     "taskId" TEXT;

-- CreateTable
CREATE TABLE "LearningTask" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LearningTask_planId_idx" ON "LearningTask"("planId");

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "LearningTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningTask" ADD CONSTRAINT "LearningTask_planId_fkey" FOREIGN KEY ("planId") REFERENCES "StudyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
