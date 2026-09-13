import { prisma } from "@/lib/db";
import { getAuthedUserId } from "./auth";


type Lecture = {
  id: number;
  title: string;
  createdAt: Date;
};

export async function getLecturesForPaper(paperId: number): Promise<Lecture[]> {
    const user_id = await getAuthedUserId();
    if(!user_id) return [];
    const data = await prisma.upload.findMany({
                
                where:{
                    paper:{
                        user_id:user_id,
                        paper_id:paperId,
                    }
                },
                orderBy:{
                    uploaded_at:"desc",
                },
                select: {
                  upload_id: true,
                  filename: true,
                  uploaded_at: true,
                },
            })

    console.log(data)
    const list = data.map(item => {
        return {
          id: item.upload_id,
          title: item.filename,
          createdAt: item.uploaded_at
        };
      });

    return list;
}

export async function getLectureConentById(id: string) {
    try {
        const user_id = await getAuthedUserId();
        if (!user_id) return null;

        // Scoped to the caller's own papers: an upload id from a request is not
        // evidence that the upload belongs to whoever sent it.
        const textContent = await prisma.upload.findFirst({
            where: {
                paper: {
                    user_id: user_id
                },
                upload_id: Number(id),
            }
        });

        return textContent?.text_content || null;
    } catch (error) {
        console.error("Error in getLectureConentById:", error);
        return null;
    }
};
