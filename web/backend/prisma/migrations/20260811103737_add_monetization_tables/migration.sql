-- CreateEnum
CREATE TYPE "public"."SubscriptionModule" AS ENUM ('patient', 'doctor', 'laboratory', 'pharmacy');

-- CreateEnum
CREATE TYPE "public"."BillingCycle" AS ENUM ('monthly', 'annual', 'payg');

-- CreateEnum
CREATE TYPE "public"."UserSubscriptionStatus" AS ENUM ('active', 'expired', 'cancelled', 'pending_renewal');

-- CreateEnum
CREATE TYPE "public"."FeeType" AS ENUM ('payment_processing', 'transfer_levy', 'vat_stack');

-- CreateEnum
CREATE TYPE "public"."CommissionModule" AS ENUM ('laboratory', 'pharmacy');

-- CreateEnum
CREATE TYPE "public"."ConsultReviewStatus" AS ENUM ('pending_review', 'co_signed', 'flagged_for_followup');

-- AlterEnum
ALTER TYPE "public"."TransactionType" ADD VALUE 'LAB_ORDER_PAYMENT';

-- AlterTable (Add new optional fields only)
ALTER TABLE "public"."transaction" ADD COLUMN "amountGHS" DOUBLE PRECISION,
ADD COLUMN "commissionTierApplied" TEXT,
ADD COLUMN "labOrderId" TEXT,
ADD COLUMN "paId" TEXT,
ADD COLUMN "paymentProcessingFee" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN "paymentReference" TEXT,
ADD COLUMN "platformCommission" DOUBLE PRECISION,
ADD COLUMN "providerPayout" DOUBLE PRECISION,
ADD COLUMN "supervisingDoctorId" TEXT,
ADD COLUMN "supervisingDoctorPayout" DOUBLE PRECISION DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "module" "public"."SubscriptionModule" NOT NULL,
    "name" TEXT NOT NULL,
    "billingCycle" "public"."BillingCycle" NOT NULL,
    "priceGHS" DOUBLE PRECISION NOT NULL,
    "priceUSD" DOUBLE PRECISION NOT NULL,
    "commissionRateOverride" DOUBLE PRECISION,
    "perks" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "public"."UserSubscriptionStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "paymentMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlatformFeeConfig" (
    "id" TEXT NOT NULL,
    "feeType" "public"."FeeType" NOT NULL,
    "ratePct" DOUBLE PRECISION NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "sourceNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformFeeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PaRevenueSplit" (
    "id" TEXT NOT NULL,
    "paId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "paSharePct" DOUBLE PRECISION NOT NULL DEFAULT 70,
    "doctorSharePct" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaRevenueSplit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PaConsultReview" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "paId" TEXT NOT NULL,
    "supervisingDoctorId" TEXT NOT NULL,
    "consultNotes" TEXT,
    "reviewStatus" "public"."ConsultReviewStatus" NOT NULL DEFAULT 'pending_review',
    "doctorComments" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaConsultReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VolumeCommissionTier" (
    "id" TEXT NOT NULL,
    "module" "public"."CommissionModule" NOT NULL,
    "tierName" TEXT NOT NULL,
    "minMonthlyOrders" INTEGER NOT NULL,
    "maxMonthlyOrders" INTEGER,
    "commissionPct" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VolumeCommissionTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserSubscription_userId_idx" ON "public"."UserSubscription"("userId");
CREATE INDEX "UserSubscription_planId_idx" ON "public"."UserSubscription"("planId");
CREATE INDEX "PaRevenueSplit_paId_idx" ON "public"."PaRevenueSplit"("paId");
CREATE INDEX "PaRevenueSplit_doctorId_idx" ON "public"."PaRevenueSplit"("doctorId");
CREATE UNIQUE INDEX "PaConsultReview_transactionId_key" ON "public"."PaConsultReview"("transactionId");
CREATE INDEX "PaConsultReview_paId_idx" ON "public"."PaConsultReview"("paId");
CREATE INDEX "PaConsultReview_supervisingDoctorId_idx" ON "public"."PaConsultReview"("supervisingDoctorId");

-- AddForeignKey
ALTER TABLE "public"."transaction" ADD CONSTRAINT "transaction_labOrderId_fkey" FOREIGN KEY ("labOrderId") REFERENCES "public"."LabOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."UserSubscription" ADD CONSTRAINT "UserSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."UserSubscription" ADD CONSTRAINT "UserSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."SubscriptionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."PaConsultReview" ADD CONSTRAINT "PaConsultReview_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "public"."transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
