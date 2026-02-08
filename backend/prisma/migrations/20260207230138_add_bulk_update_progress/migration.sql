-- CreateTable
CREATE TABLE "BulkUpdateProgress" (
    "id" TEXT NOT NULL,
    "server_id" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "completed" INTEGER NOT NULL,
    "failed" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "current_plugin" TEXT,
    "retry_after" INTEGER,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BulkUpdateProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BulkUpdateProgress_server_id_idx" ON "BulkUpdateProgress"("server_id");

-- AddForeignKey
ALTER TABLE "BulkUpdateProgress" ADD CONSTRAINT "BulkUpdateProgress_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;
