-- AlterTable
ALTER TABLE "Plugin" ADD COLUMN     "latest_version" TEXT;

-- AlterTable
ALTER TABLE "ScheduledUpdate" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "last_run" TIMESTAMP(3),
ADD COLUMN     "next_run" TIMESTAMP(3),
ADD COLUMN     "server_id" TEXT,
ADD COLUMN     "task_type" TEXT;

-- AlterTable
ALTER TABLE "Webhook" ADD COLUMN     "server_id" TEXT;

-- AddForeignKey
ALTER TABLE "ScheduledUpdate" ADD CONSTRAINT "ScheduledUpdate_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;
