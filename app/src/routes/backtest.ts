import express from "express";
import BacktestController from "../controller/backtestController";
import auth from "./middleware/auth";
const router = express.Router();

router.get("/:backtestId", auth.isAuthorized, BacktestController.getOne);
router.get("/:backtestId/run", auth.isAuthorized, BacktestController.runOne);
router.get(
  "/portfolio/:portfolioId",
  auth.isAuthorized,
  BacktestController.get
);
router.post("/", auth.isAuthorized, BacktestController.create);

export default router;
