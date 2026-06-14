-- CreateEnum
CREATE TYPE "ConnectionTier" AS ENUM ('FAMILY', 'GENERAL');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- CreateTable
CREATE TABLE "Connection" (
    "id" TEXT NOT NULL,
    "accountAId" TEXT NOT NULL,
    "accountBId" TEXT NOT NULL,
    "tier" "ConnectionTier" NOT NULL DEFAULT 'GENERAL',
    "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Connection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Connection_accountAId_status_idx" ON "Connection"("accountAId", "status");

-- CreateIndex
CREATE INDEX "Connection_accountBId_status_idx" ON "Connection"("accountBId", "status");

-- CreateIndex
CREATE INDEX "Connection_requestedById_idx" ON "Connection"("requestedById");

-- CreateIndex
CREATE UNIQUE INDEX "Connection_accountAId_accountBId_key" ON "Connection"("accountAId", "accountBId");

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_accountAId_fkey" FOREIGN KEY ("accountAId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_accountBId_fkey" FOREIGN KEY ("accountBId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
