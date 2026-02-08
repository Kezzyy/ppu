/*
  Warnings:

  - You are about to drop the column `server_id` on the `Webhook` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Webhook" DROP CONSTRAINT "Webhook_server_id_fkey";

-- AlterTable
ALTER TABLE "Webhook" DROP COLUMN "server_id",
ADD COLUMN     "all_servers" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "_ServerToWebhook" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_ServerToWebhook_AB_unique" ON "_ServerToWebhook"("A", "B");

-- CreateIndex
CREATE INDEX "_ServerToWebhook_B_index" ON "_ServerToWebhook"("B");

-- AddForeignKey
ALTER TABLE "_ServerToWebhook" ADD CONSTRAINT "_ServerToWebhook_A_fkey" FOREIGN KEY ("A") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ServerToWebhook" ADD CONSTRAINT "_ServerToWebhook_B_fkey" FOREIGN KEY ("B") REFERENCES "Webhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
