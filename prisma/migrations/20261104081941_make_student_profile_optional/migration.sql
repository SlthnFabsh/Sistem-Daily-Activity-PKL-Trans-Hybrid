-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "profileCompleted" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "schoolName" DROP NOT NULL;
