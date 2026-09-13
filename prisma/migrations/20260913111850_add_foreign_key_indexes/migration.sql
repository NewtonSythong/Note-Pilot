-- CreateIndex
CREATE INDEX "chat_message_user_id_idx" ON "chat_message"("user_id");

-- CreateIndex
CREATE INDEX "flashcard_set_id_idx" ON "flashcard"("set_id");

-- CreateIndex
CREATE INDEX "paper_user_id_idx" ON "paper"("user_id");

-- CreateIndex
CREATE INDEX "problem_pset_id_idx" ON "problem"("pset_id");

-- CreateIndex
CREATE INDEX "session_user_id_idx" ON "session"("user_id");

-- CreateIndex
CREATE INDEX "term_glossary_id_idx" ON "term"("glossary_id");

-- CreateIndex
CREATE INDEX "twofactorauthtoken_user_id_idx" ON "twofactorauthtoken"("user_id");

-- CreateIndex
CREATE INDEX "upload_paper_id_idx" ON "upload"("paper_id");
