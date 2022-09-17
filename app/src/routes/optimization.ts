import express from "express";
import optimizerController from "../controller/optimizationController";
import auth from "./middleware/auth";
const router = express.Router();

router.get("/form", auth.isAuthorized, optimizerController.getForm);

router.get(
  "/:optimizerId/form",
  auth.isAuthorized,
  optimizerController.getOneForm
);

router.post("/:optimizerId", auth.isAuthorized, optimizerController.editOne);

router.get("/:optimizerId", auth.isAuthorized, optimizerController.getOne);

router.post("/:optimizerId/run", auth.isAuthorized, optimizerController.runOne);

router.post(
  "/:optimizerId/cancel",
  auth.isAuthorized,
  optimizerController.cancel
);

router.get(
  "/portfolio/:portfolioId",
  auth.isAuthorized,
  optimizerController.getSummaries
);

router.post(
  "/portfolio/:portfolioId",
  auth.isAuthorized,
  optimizerController.optimize
);

export default router;
