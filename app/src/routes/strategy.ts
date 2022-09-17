import express from "express";
import strategyController from "../controller/strategyController";
import auth from "./middleware/auth";
const router = express.Router();

router.get("/", auth.isAuthorized, strategyController.get);
router.get("/:strategyId", auth.isAuthorized, strategyController.getOne);

export default router;
