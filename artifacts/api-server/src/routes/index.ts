import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import reposRouter from "./repos";
import generateRouter from "./generate";
import creditsRouter from "./credits";
import webhooksRouter from "./webhooks";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/repos", reposRouter);
router.use("/generate", generateRouter);
router.use("/generations", generateRouter);
router.use("/credits", creditsRouter);
router.use("/webhooks", webhooksRouter);

export default router;
