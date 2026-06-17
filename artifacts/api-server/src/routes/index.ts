import { Router, type IRouter } from "express";
import healthRouter from "./health";
import schoolRouter from "./school";
import classesRouter from "./classes";
import studentsRouter from "./students";
import learningAreasRouter from "./learningAreas";
import examsRouter from "./exams";
import scoresRouter from "./scores";
import reportsRouter from "./reports";
import rankingsRouter from "./rankings";
import analyticsRouter from "./analytics";
import dashboardRouter from "./dashboard";
import trendsRouter from "./trends";

const router: IRouter = Router();

router.use(healthRouter);
router.use(schoolRouter);
router.use(classesRouter);
router.use(studentsRouter);
router.use(learningAreasRouter);
router.use(examsRouter);
router.use(scoresRouter);
router.use(reportsRouter);
router.use(rankingsRouter);
router.use(analyticsRouter);
router.use(dashboardRouter);
router.use(trendsRouter);

export default router;
