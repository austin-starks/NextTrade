import express from "express";
import portfolioController from "../controller/portfolioController";
import strategyController from "../controller/strategyController";
import auth from "./middleware/auth";
const router = express.Router();

router.get("/", auth.isAuthorized, portfolioController.getPortfolios);

router.post("/", auth.isAuthorized, portfolioController.createPortfolio);

router.get(
  "/:portfolioId",
  auth.isAuthorized,
  portfolioController.getPortfolio
);

router.post(
  "/:portfolioId",
  auth.isAuthorized,
  portfolioController.editPortfolio
);

router.post(
  "/:portfolioId/mock",
  auth.isAuthorized,
  portfolioController.editPortfolioFromMock
);

router.get(
  "/:portfolioId/history",
  auth.isAuthorized,
  portfolioController.getPortfolioHistory
);

router.post(
  "/:portfolioId/strategies",
  auth.isAuthorized,
  strategyController.updatePortfolioStrategy
);

router.delete(
  "/:portfolioId/strategies/:strategyId",
  auth.isAuthorized,
  strategyController.deletePortfolioStrategy
);

export default router;
