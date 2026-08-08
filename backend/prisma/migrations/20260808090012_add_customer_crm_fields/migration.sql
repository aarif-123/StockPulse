-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "followUpDate" TIMESTAMP(3),
ADD COLUMN     "mobile" TEXT;

-- CreateIndex
CREATE INDEX "customers_mobile_idx" ON "customers"("mobile");
