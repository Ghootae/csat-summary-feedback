import { Router, type IRouter } from "express";
import healthRouter from "./health";
import diagnoseRouter from "./diagnose";
import paragraphsRouter from "./paragraphs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(diagnoseRouter);
router.use(paragraphsRouter);

export default router;
