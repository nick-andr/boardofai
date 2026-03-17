/*
  Warnings:

  - You are about to drop the column `verdictJson` on the `summaries` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "summaries" DROP COLUMN "verdictJson",
ADD COLUMN     "stances" JSONB;
