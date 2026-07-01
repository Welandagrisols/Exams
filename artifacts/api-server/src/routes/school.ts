import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, schoolTable } from "@workspace/db";
import { GetSchoolResponse, UpdateSchoolBody, UpdateSchoolResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/school", async (_req, res): Promise<void> => {
  let [school] = await db.select().from(schoolTable).limit(1);
  if (!school) {
    const [created] = await db.insert(schoolTable).values({ name: "My School" }).returning();
    school = created;
  }
  res.json(GetSchoolResponse.parse(school));
});

router.patch("/school", async (req, res): Promise<void> => {
  const parsed = UpdateSchoolBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  let [school] = await db.select().from(schoolTable).limit(1);
  if (!school) {
    const [created] = await db.insert(schoolTable).values({ name: "My School", ...parsed.data }).returning();
    res.json(UpdateSchoolResponse.parse(created));
    return;
  }
  const [updated] = await db.update(schoolTable).set(parsed.data).where(eq(schoolTable.id, school.id)).returning();
  res.json(UpdateSchoolResponse.parse(updated));
});

export default router;
