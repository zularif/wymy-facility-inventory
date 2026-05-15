import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import itemsRouter from "./items";
import stockRouter from "./stock";
import dashboardRouter from "./dashboard";
import profilesRouter from "./profiles";
import reportsRouter from "./reports";
import auditRouter from "./audit";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/items", itemsRouter);
router.use("/stock-movements", stockRouter);
router.use("/dashboard", dashboardRouter);
router.use("/profiles", profilesRouter);
router.use("/reports", reportsRouter);
router.use("/audit-log", auditRouter);

export default router;
