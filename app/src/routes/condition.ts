import express from "express";
import conditionController from "../controller/conditionController";
import auth from "./middleware/auth";
const router = express.Router();

router.get("/", auth.isAuthorized, conditionController.getConditions);
router.delete("/:conditionId", auth.isAuthorized, conditionController.delete);
router.post("/", auth.isAuthorized, conditionController.validateAndCreate);
router.post(
  "/compound",
  auth.isAuthorized,
  conditionController.validateAndCreateCompound
);

export default router;
