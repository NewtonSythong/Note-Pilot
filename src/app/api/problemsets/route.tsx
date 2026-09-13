import { getAuthedUserId } from "@/lib/auth";
import { parseUploadIds } from "@/lib/uploadIds";
import { userOwnsAllUploads, userOwnsProblem } from "@/lib/ownership";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * API route for managing problem sets.
 * Supports:
 * - Generating exam-style questions (persistent)
 * - Storing user answers (persistent)
 * - Evaluating answers with feedback (temporary/not persistent)
 */

const API_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * GET function - Retrieve existing problem sets and user answers
 */
export async function GET(request: Request) {
    try {
        const userId = await getAuthedUserId();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const parsedIds = parseUploadIds(new URL(request.url));
        if ('error' in parsedIds) {
            return NextResponse.json({ error: parsedIds.error }, { status: 400 });
        }
        const targetUploadIds = parsedIds.ids;

        // Problem sets are keyed by upload, so reading one by upload id reads
        // whatever user that upload belongs to. Gate on ownership first.
        if (!(await userOwnsAllUploads(targetUploadIds, userId))) {
            return NextResponse.json({ error: "Upload not found" }, { status: 404 });
        }

        // Check if problem set exists for these uploads
        const existingProblemSet = await prisma.problem_set.findFirst({
            where: {
                upload_id: { in: targetUploadIds }
            },
            include: {
                problem: true
            },
            orderBy: { pset_id: 'desc' }
        });

        if (existingProblemSet) {
            // Only this user's answers: user_answer is keyed by problem and
            // user, and the same problem set is not shared, but scoping here
            // keeps the query honest if that ever changes.
            const answers = await prisma.user_answer.findMany({
                where: {
                    user_id: userId,
                    problem_id: { in: existingProblemSet.problem.map((p) => p.problem_id) },
                },
            });
            const answerByProblem = new Map(answers.map((a) => [a.problem_id, a]));

            const questionsWithAnswers = existingProblemSet.problem.map((problem) => {
                const saved = answerByProblem.get(problem.problem_id);
                return {
                    id: problem.problem_id,
                    question: problem.question_text,
                    answer: problem.answer_text || "",
                    userAnswer: saved?.answer_text ?? "",
                    userAnswerId: saved?.answer_id ?? null
                };
            });

            return NextResponse.json({ 
                success: true, 
                questions: questionsWithAnswers,
                problemSetId: existingProblemSet.pset_id,
                cached: true
            });
        }

        return NextResponse.json({ success: true, questions: null });

    } catch (error) {
        console.error("Error fetching problem set:", error);
        return NextResponse.json({ error: "Failed to fetch problem set" }, { status: 500 });
    }
}

/**
 * POST function
 * @param req the request object containing mode, uploadIds, userAnswer, and questions.
 * @returns the generated questions, saved user answer, or evaluation feedback in JSON format.
 */
export async function POST(req: Request){
    try{
        const userId = await getAuthedUserId();
        if(!userId) {
            return NextResponse.json({error: "Unauthorized"}, {status: 401});
        }

        const {mode, uploadIds, lectureId, userAnswer, questions, problemId, userAnswerId} = await req.json();

        if(!mode) {
            return NextResponse.json({error:"No mode selected"}, {status: 400});
        }

        // GENERATE QUESTIONS (Persistent)
        if(mode === "generate"){
            if(!uploadIds || !Array.isArray(uploadIds) || uploadIds.length === 0) {
                return NextResponse.json({error:"Upload IDs must be provided"}, {status: 400});
            }

            // Get text content from all selected uploads
            let combinedContent = "";
            for (const uploadId of uploadIds) {
                const upload = await prisma.upload.findFirst({
                    where: {
                        upload_id: parseInt(uploadId),
                        paper: { user_id: userId }
                    }
                });
                
                if (upload && upload.text_content) {
                    combinedContent += `\n\n--- Content from ${upload.filename} ---\n${upload.text_content}`;
                }
            }

            if (!combinedContent.trim()) {
                return NextResponse.json({error: "No content available from selected uploads"}, {status: 400});
            }

            const query = `You are an AI tutor. Generate 4–6 exam-style short answer questions based on the following lecture text. 
                    Each question must include:
                    1. "question": The question text.
                    2. "answer": The ideal answer for evaluation later.

                    Format your response as a JSON array, like:
                    [
                        {"question": "What is polymorphism in OOP?", "answer": "The ability of objects to take many forms..."},
                        {"question": "...", "answer": "..."}
                    ]

                    Content to analyze:
                    """${combinedContent.slice(0, 15000)}"""
                    `;

            const resp = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.NVIDIA_AI_API}`,
                },
                body: JSON.stringify({
                    model: "nvidia/nemotron-3.5-lightning:free",
                    messages: [{ role: "user", content: query }],
                }),
            });

            const data = await resp.json();
            console.log(data);
            const jsonStr = data?.choices?.[0]?.message?.content ?? "[]";
            
            let parsed;
            try {
                parsed = JSON.parse(jsonStr);
            } catch (e) {
                console.error("Failed to parse AI response:", e);
                return NextResponse.json({error: "Invalid AI response format"}, {status: 500});
            }

            // Save problem set to database
            try {
                // upload_id is unique on problem_set — clear out any existing set for
                // this upload first so regenerating doesn't hit a P2002 conflict.
                // Cascades to delete its problem rows too.
                await prisma.problem_set.deleteMany({
                    where: { upload_id: uploadIds[0] }
                });

                const problemSet = await prisma.problem_set.create({
                    data: {
                        upload_id: uploadIds[0], // Store against first upload for simplicity
                        text_data: `Problem set for uploads: ${uploadIds.join(', ')}`
                    }
                });

                // Save individual problems
                const problems = await Promise.all(
                    parsed.map(async (q: any, index: number) => {
                        return await prisma.problem.create({
                            data: {
                                pset_id: problemSet.pset_id,
                                question_text: q.question,
                                answer_text: q.answer
                            }
                        });
                    })
                );

                const questionsWithIds = problems.map(problem => ({
                    id: problem.problem_id,
                    question: problem.question_text,
                    answer: problem.answer_text,
                    userAnswer: "",
                    userAnswerId: null
                }));

                console.log(`Problem set saved with ${problems.length} questions`);
                return NextResponse.json({questions: questionsWithIds, problemSetId: problemSet.pset_id});

            } catch (dbError) {
                console.error("Failed to save problem set:", dbError);
                // Return questions anyway, just not persisted
                const questionsWithoutIds = parsed.map((q: any, index: number) => ({
                    id: `temp_${index}`,
                    question: q.question,
                    answer: q.answer,
                    userAnswer: "",
                    userAnswerId: null
                }));
                return NextResponse.json({questions: questionsWithoutIds});
            }

        // SAVE USER ANSWER
        } else if(mode === "saveAnswer") {
            if (typeof problemId !== "number" || typeof userAnswer !== "string") {
                return NextResponse.json({error: "problemId and userAnswer are required"}, {status: 400});
            }

            // A problem id arrives from the client like any other id, so it is
            // not evidence the question belongs to whoever sent it.
            if (!(await userOwnsProblem(problemId, userId))) {
                return NextResponse.json({error: "Problem not found"}, {status: 404});
            }

            // Replaces the previous answer rather than appending: the unique
            // constraint on (problem_id, user_id) is what makes this an edit.
            const saved = await prisma.user_answer.upsert({
                where: { problem_id_user_id: { problem_id: problemId, user_id: userId } },
                update: { answer_text: userAnswer },
                create: { problem_id: problemId, user_id: userId, answer_text: userAnswer },
            });

            return NextResponse.json({ success: true, userAnswerId: saved.answer_id });

        // EVALUATE ANSWER (Temporary - Not Persistent)
        } else if(mode === "evaluate"){
            const {question, answer} = questions;
            console.log(question, answer, userAnswer);

            if (!question || !answer || !userAnswer) {
                return NextResponse.json({error: "Question, answer, and user answer required"}, {status: 400});
            }

            const evaluationPrompt = `
            You are an exam evaluator. Compare the student's answer with the correct answer and provide constructive feedback.
            
            Return your response as valid JSON in this exact format:
            {
                "feedback": "Detailed feedback explaining what was good and what could be improved...",
                "score": 0.85
            }
            
            The score should be between 0 and 1, where 1 is perfect.
            
            Question: ${question}
            Correct Answer: ${answer}
            Student Answer: ${userAnswer}
            `;

            const resp = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.NVIDIA_AI_API}`,
                },
                body: JSON.stringify({
                    model: "nvidia/nemotron-3.5-lightning:free",
                    messages: [
                        { role: "user", content: evaluationPrompt }
                    ],
                }),
            });

            const data = await resp.json();
            console.log(data);
            
            try {
                const feedbackJson = JSON.parse(data?.choices?.[0]?.message?.content ?? "{}");
                return NextResponse.json({ 
                    feedback: feedbackJson.feedback || "Unable to generate feedback", 
                    score: feedbackJson.score || 0 
                });
            } catch (parseError) {
                console.error("Failed to parse feedback:", parseError);
                return NextResponse.json({ 
                    feedback: "Unable to generate structured feedback", 
                    score: 0 
                });
            }

        } else {
            return NextResponse.json({error: "Invalid mode"}, {status: 400});
        }
    }catch(err: any){
        console.error("Error at /api/problemsets:", err);
        return NextResponse.json({error: "Internal server error"}, {status: 500});
    }
}