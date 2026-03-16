-- CreateTable
CREATE TABLE "LearningSchedule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LearningSchedule_userId_idx" ON "LearningSchedule"("userId");

-- AddForeignKey
ALTER TABLE "LearningSchedule" ADD CONSTRAINT "LearningSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
