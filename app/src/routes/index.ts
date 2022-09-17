import express from "express";
import auth from "./middleware/auth";
const router = express.Router();

router.get("/ping", (_, res) => {
  res.send("Ping Successful");
});

router.get("/protected", auth.isAuthorized, (_, res) => {
  res.send("Protected Route Successful");
});

export default router;
