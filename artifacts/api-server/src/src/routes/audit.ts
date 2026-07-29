import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, auditLogsTable } from "@workspace/db";
import { isStaff, forbidden, type AppLocals } from "../middlewares/rbac";

const router: IRouter = Router();

/**
 * GET /api/audit-logs
 * Staff only. Most recent first, capped at 100 per request since this is a
 * quick activity feed, not a full export tool.
 * Optional ?entityType=class to filter.
 */
router.get("/audit-logs", async (req, res): Promise<void> => {
  if (!isStaff(res.locals as AppLocals)) {
    forbidden(res, "Only admin, principal, or deputy can view the activity log."); return;
  }
  const entityType = typeof req.query.entityType === "string" ? req.query.entityType : undefined;

  const rows = await db
    .select()
    .from(auditLogsTable)
    .where(entityType ? eq(auditLogsTable.entityType, entityType) : undefined)
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(100);

  res.json(rows);
});

export default router;
