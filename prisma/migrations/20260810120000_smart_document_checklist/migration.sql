CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'PREPARED', 'SUBMITTED');

CREATE TABLE "DocumentChecklistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DocumentChecklistItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DocumentChecklistItem_userId_programId_title_key" ON "DocumentChecklistItem"("userId", "programId", "title");
CREATE INDEX "DocumentChecklistItem_userId_status_idx" ON "DocumentChecklistItem"("userId", "status");

ALTER TABLE "DocumentChecklistItem" ADD CONSTRAINT "DocumentChecklistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentChecklistItem" ADD CONSTRAINT "DocumentChecklistItem_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;
