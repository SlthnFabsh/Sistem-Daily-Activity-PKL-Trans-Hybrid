-- AlterEnum
ALTER TYPE "LogStatus" ADD VALUE 'APPROVED';

-- AlterTable
ALTER TABLE "ActivityLog" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT;
