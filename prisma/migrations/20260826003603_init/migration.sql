-- CreateTable
CREATE TABLE "public"."application_user" (
    "user_id" SERIAL NOT NULL,
    "username" VARCHAR(20) NOT NULL,
    "password" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "date_of_creation" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_user_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "public"."chat_message" (
    "message_id" SERIAL NOT NULL,
    "upload_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_message_pkey" PRIMARY KEY ("message_id")
);

-- CreateTable
CREATE TABLE "public"."flashcard" (
    "flashcard_id" SERIAL NOT NULL,
    "set_id" INTEGER NOT NULL,
    "question_front" TEXT NOT NULL,
    "answer_back" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "learnt" BOOLEAN DEFAULT false,

    CONSTRAINT "flashcard_pkey" PRIMARY KEY ("flashcard_id")
);

-- CreateTable
CREATE TABLE "public"."flashcard_set" (
    "set_id" SERIAL NOT NULL,
    "upload_id" INTEGER NOT NULL,
    "text_data" TEXT NOT NULL,

    CONSTRAINT "flashcard_set_pkey" PRIMARY KEY ("set_id")
);

-- CreateTable
CREATE TABLE "public"."glossary" (
    "glossary_id" SERIAL NOT NULL,
    "upload_id" INTEGER NOT NULL,
    "text_data" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "glossary_pkey" PRIMARY KEY ("glossary_id")
);

-- CreateTable
CREATE TABLE "public"."paper" (
    "paper_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "started_on" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "code" TEXT,
    "description" TEXT,
    "filename" TEXT,

    CONSTRAINT "paper_pkey" PRIMARY KEY ("paper_id")
);

-- CreateTable
CREATE TABLE "public"."preferences" (
    "user_id" INTEGER NOT NULL,
    "learner_style" VARCHAR(50),
    "dark_mode" BOOLEAN DEFAULT false,
    "language" VARCHAR(20),

    CONSTRAINT "preferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "public"."problem" (
    "problem_id" SERIAL NOT NULL,
    "pset_id" INTEGER NOT NULL,
    "question_text" TEXT NOT NULL,
    "answer_text" TEXT,

    CONSTRAINT "problem_pkey" PRIMARY KEY ("problem_id")
);

-- CreateTable
CREATE TABLE "public"."problem_set" (
    "pset_id" SERIAL NOT NULL,
    "upload_id" INTEGER NOT NULL,
    "text_data" TEXT NOT NULL,

    CONSTRAINT "problem_set_pkey" PRIMARY KEY ("pset_id")
);

-- CreateTable
CREATE TABLE "public"."session" (
    "session_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(6),
    "last_active_at" TIMESTAMP(6),
    "is_used" BOOLEAN DEFAULT false,

    CONSTRAINT "session_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "public"."summary" (
    "summary_id" SERIAL NOT NULL,
    "upload_id" INTEGER NOT NULL,
    "text_data" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "summary_pkey" PRIMARY KEY ("summary_id")
);

-- CreateTable
CREATE TABLE "public"."study_guide" (
    "id" SERIAL NOT NULL,
    "paper_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "ai_level" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "study_guide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."term" (
    "term_id" SERIAL NOT NULL,
    "glossary_id" INTEGER NOT NULL,
    "term_data" TEXT NOT NULL,

    CONSTRAINT "term_pkey" PRIMARY KEY ("term_id")
);

-- CreateTable
CREATE TABLE "public"."twofactorauthtoken" (
    "token_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "is_used" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "twofactorauthtoken_pkey" PRIMARY KEY ("token_id")
);

-- CreateTable
CREATE TABLE "public"."upload" (
    "upload_id" SERIAL NOT NULL,
    "paper_id" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "file_type" TEXT,
    "text_content" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upload_pkey" PRIMARY KEY ("upload_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "application_user_username_key" ON "public"."application_user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "application_user_email_key" ON "public"."application_user"("email");

-- CreateIndex
CREATE INDEX "chat_message_upload_id_user_id_idx" ON "public"."chat_message"("upload_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "flashcard_set_upload_id_key" ON "public"."flashcard_set"("upload_id");

-- CreateIndex
CREATE UNIQUE INDEX "glossary_upload_id_key" ON "public"."glossary"("upload_id");

-- CreateIndex
CREATE UNIQUE INDEX "problem_set_upload_id_key" ON "public"."problem_set"("upload_id");

-- CreateIndex
CREATE UNIQUE INDEX "tokensunique" ON "public"."session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "summary_upload_id_key" ON "public"."summary"("upload_id");

-- CreateIndex
CREATE INDEX "study_guide_paper_id_ai_level_idx" ON "public"."study_guide"("paper_id", "ai_level");

-- AddForeignKey
ALTER TABLE "public"."chat_message" ADD CONSTRAINT "chat_message_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "public"."upload"("upload_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."chat_message" ADD CONSTRAINT "chat_message_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."application_user"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."flashcard" ADD CONSTRAINT "flashcard_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "public"."flashcard_set"("set_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."flashcard_set" ADD CONSTRAINT "flashcard_set_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "public"."upload"("upload_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."glossary" ADD CONSTRAINT "glossary_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "public"."upload"("upload_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."paper" ADD CONSTRAINT "paper_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."application_user"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."preferences" ADD CONSTRAINT "preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."application_user"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."problem" ADD CONSTRAINT "problem_pset_id_fkey" FOREIGN KEY ("pset_id") REFERENCES "public"."problem_set"("pset_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."problem_set" ADD CONSTRAINT "problem_set_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "public"."upload"("upload_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."session" ADD CONSTRAINT "session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."application_user"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."summary" ADD CONSTRAINT "summary_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "public"."upload"("upload_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."study_guide" ADD CONSTRAINT "study_guide_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "public"."paper"("paper_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."term" ADD CONSTRAINT "term_glossary_id_fkey" FOREIGN KEY ("glossary_id") REFERENCES "public"."glossary"("glossary_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."twofactorauthtoken" ADD CONSTRAINT "twofactorauthtoken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."application_user"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."upload" ADD CONSTRAINT "upload_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "public"."paper"("paper_id") ON DELETE CASCADE ON UPDATE NO ACTION;
