-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slack_user_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "real_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "channels" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slack_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slack_ts" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "user_id" TEXT,
    "text" TEXT NOT NULL,
    "thread_ts" TEXT,
    "reply_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "messages_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "message_id" TEXT NOT NULL,
    "slack_url" TEXT NOT NULL,
    "backup_url" TEXT,
    "mime_type" TEXT,
    "name" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "files_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bookmarks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bookmarks_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_slack_user_id_key" ON "users"("slack_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "channels_slack_id_key" ON "channels"("slack_id");

-- CreateIndex
CREATE INDEX "messages_channel_id_idx" ON "messages"("channel_id");

-- CreateIndex
CREATE INDEX "messages_thread_ts_idx" ON "messages"("thread_ts");

-- CreateIndex
CREATE INDEX "messages_user_id_idx" ON "messages"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "messages_channel_id_slack_ts_key" ON "messages"("channel_id", "slack_ts");

-- CreateIndex
CREATE UNIQUE INDEX "bookmarks_user_id_message_id_key" ON "bookmarks"("user_id", "message_id");
