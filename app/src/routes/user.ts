import express from "express";
import authenticationController from "../controller/userController";
const router = express.Router();

router.post("/login", authenticationController.login);
router.post("/register", authenticationController.register);
router.post("/logout", authenticationController.logout);

export default router;
