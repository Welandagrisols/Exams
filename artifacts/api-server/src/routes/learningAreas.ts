import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, learningAreasTable } from "@workspace/db";
import {
  ListLearningAreasResponse,
  CreateLearningAreaBody,
  UpdateLearningAreaParams,
  UpdateLearningAreaBody,
  UpdateLearningAreaResponse,
  DeleteLearningAreaParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/learning-areas", async (_req, res): Promise<void> => {
  const rows = await db.select().from(learningAreasTable).orderBy(asc(learningAreasTable.sortOrder), asc(learningAreasTable.name));
  res.json(ListLearningAreasResponse.parse(rows));
});

router.post("/learning-areas", async (req, res): Promise<void> => {
  const parsed = CreateLearningAreaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = {
    ...parsed.data,
    maxMarks: parsed.data.maxMarks ?? 100,
    sortOrder: parsed.data.sortOrder ?? 0,
  };
  const [area] = await db.insert(learningAreasTable).values(data).returning();
  res.status(201).json(area);
});

router.patch("/learning-areas/:id", async (req, res): Promise<void> => {
  const params = UpdateLearningAreaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateLearningAreaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db.update(learningAreasTable).set(parsed.data).where(eq(learningAreasTable.id, params.data.id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Learning area not found" });
    return;
  }
  res.json(UpdateLearningAreaResponse.parse(updated));
});

router.delete("/learning-areas/:id", async (req, res): Promise<void> => {
  const params = DeleteLearningAreaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db.delete(learningAreasTable).where(eq(learningAreasTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Learning area not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
