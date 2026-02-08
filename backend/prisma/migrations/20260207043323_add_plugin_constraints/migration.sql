/*
  Warnings:

  - A unique constraint covering the columns `[server_id,filename]` on the table `Plugin` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Plugin" ADD COLUMN     "is_managed" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Plugin_server_id_filename_key" ON "Plugin"("server_id", "filename");
