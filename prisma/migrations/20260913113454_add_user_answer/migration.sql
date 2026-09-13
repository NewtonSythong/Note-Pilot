-- CreateTable
CREATE TABLE "user_answer" (
    "answer_id" SERIAL NOT NULL,
    "problem_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "answer_text" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "user_answer_pkey" PRIMARY KEY ("answer_id")
);

-- CreateIndex
CREATE INDEX "user_answer_user_id_idx" ON "user_answer"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_answer_problem_id_user_id_key" ON "user_answer"("problem_id", "user_id");

-- AddForeignKey
ALTER TABLE "user_answer" ADD CONSTRAINT "user_answer_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "problem"("problem_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_answer" ADD CONSTRAINT "user_answer_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "application_user"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;
