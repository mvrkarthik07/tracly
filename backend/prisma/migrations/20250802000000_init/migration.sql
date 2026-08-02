CREATE TYPE "TxType" AS ENUM ('INCOME', 'EXPENSE');

CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" "TxType" NOT NULL,
    "category" TEXT NOT NULL,
    "note" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT,
    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WeeklyReport" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "totalIncome" DECIMAL(12,2) NOT NULL,
    "totalExpense" DECIMAL(12,2) NOT NULL,
    "net" DECIMAL(12,2) NOT NULL,
    "byCategory" JSONB NOT NULL,
    "topCategory" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeeklyReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Transaction_clientId_key" ON "Transaction"("clientId");
CREATE INDEX "Transaction_occurredAt_idx" ON "Transaction"("occurredAt");
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");
CREATE UNIQUE INDEX "WeeklyReport_weekStart_weekEnd_key" ON "WeeklyReport"("weekStart", "weekEnd");
