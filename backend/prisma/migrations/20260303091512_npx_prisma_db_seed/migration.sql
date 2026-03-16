-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "questions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Quiz_contentId_key" ON "Quiz"("contentId");

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
