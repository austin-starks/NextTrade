import express from "express";
import searchController from "../controller/searchController";
import auth from "./middleware/auth";
const router = express.Router();

router.get("/", auth.isAuthorized, searchController.search);

export default router;
