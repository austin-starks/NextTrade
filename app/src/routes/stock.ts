import express from "express";
import stockController from "../controller/stockController";
import auth from "./middleware/auth";
const router = express.Router();

router.get("/:symbol/history", auth.isAuthorized, stockController.getHistory);
router.get("/:symbol", auth.isAuthorized, stockController.getData);

export default router;
