-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "modelId" TEXT,
ADD COLUMN     "parentId" TEXT;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
