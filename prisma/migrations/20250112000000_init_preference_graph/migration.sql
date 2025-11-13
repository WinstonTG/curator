-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login" TIMESTAMP(3),
    "oauth_providers" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "source" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "constraints" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "constraints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preference_vectors" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "vector" JSONB NOT NULL,
    "generated_from" JSONB NOT NULL,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preference_vectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interaction_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "feedback" TEXT,
    "context" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interaction_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "source_name" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "source_url" TEXT,
    "reputation_score" INTEGER,
    "embeddings" JSONB,
    "topics" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "sponsored" BOOLEAN NOT NULL DEFAULT false,
    "meta" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "user_id" TEXT,
    "session_id" TEXT,
    "properties" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "interests_user_id_domain_idx" ON "interests"("user_id", "domain");

-- CreateIndex
CREATE INDEX "interests_user_id_type_idx" ON "interests"("user_id", "type");

-- CreateIndex
CREATE INDEX "constraints_user_id_domain_idx" ON "constraints"("user_id", "domain");

-- CreateIndex
CREATE INDEX "constraints_user_id_type_idx" ON "constraints"("user_id", "type");

-- CreateIndex
CREATE INDEX "preference_vectors_user_id_domain_idx" ON "preference_vectors"("user_id", "domain");

-- CreateIndex
CREATE INDEX "interaction_history_user_id_domain_idx" ON "interaction_history"("user_id", "domain");

-- CreateIndex
CREATE INDEX "interaction_history_user_id_action_idx" ON "interaction_history"("user_id", "action");

-- CreateIndex
CREATE INDEX "interaction_history_timestamp_idx" ON "interaction_history"("timestamp");

-- CreateIndex
CREATE INDEX "items_domain_idx" ON "items"("domain");

-- CreateIndex
CREATE INDEX "items_source_name_source_id_idx" ON "items"("source_name", "source_id");

-- CreateIndex
CREATE INDEX "analytics_events_event_idx" ON "analytics_events"("event");

-- CreateIndex
CREATE INDEX "analytics_events_user_id_idx" ON "analytics_events"("user_id");

-- CreateIndex
CREATE INDEX "analytics_events_session_id_idx" ON "analytics_events"("session_id");

-- CreateIndex
CREATE INDEX "analytics_events_timestamp_idx" ON "analytics_events"("timestamp");

-- AddForeignKey
ALTER TABLE "interests" ADD CONSTRAINT "interests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constraints" ADD CONSTRAINT "constraints_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preference_vectors" ADD CONSTRAINT "preference_vectors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interaction_history" ADD CONSTRAINT "interaction_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
