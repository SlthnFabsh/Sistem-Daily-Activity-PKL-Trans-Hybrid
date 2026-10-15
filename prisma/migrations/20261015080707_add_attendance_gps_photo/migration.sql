-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "photoMime" TEXT,
ADD COLUMN     "photoPath" TEXT;
