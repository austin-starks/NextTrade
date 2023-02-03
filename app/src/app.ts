const DOES_RATE_LIMITING = false;
const FORCE_UPDATE_CONDITIONS = true;
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import express from "express";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";
import rateSlow from "express-slow-down";
import helmet from "helmet";
import logger from "morgan";
import nodeCleanup from "node-cleanup";
import path from "path";
import ForwardTest from "./controller/forwardtestController";
import StockData from "./models/asset/StockData";
import ConditionFactory from "./models/conditions";
import Optimizer from "./models/optimization";
import User from "./models/user";
import backtestRouter from "./routes/backtest";
import conditionRouter from "./routes/condition";
import indexRouter from "./routes/index";
import optimizerRouter from "./routes/optimization";
import portfolioRouter from "./routes/portfolio";
import searchRouter from "./routes/search";
import stockRouter from "./routes/stock";
import strategyRouter from "./routes/strategy";
import userRouter from "./routes/user";
import Db from "./services/db";
import { print } from "./utils";
dotenv.config();

const limiterStop = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // limit each IP to 100 requests per windowMs,
  headers: false, // put true if you want client to know their rate is limited,
  message: "Server Error. Please try again later.",
});

const limiterSlow = rateSlow({
  windowMs: 1 * 60 * 1000, // 1 minute
  delayAfter: 120, // allow 5 requests to go at full-speed, then...
  delayMs: 100, // 6th request has a 100ms delay, 7th has a 200ms delay, 8th gets 300ms, etc.
});

const app = express();
const db = new Db(process.env.NODE_ENV === "production" ? "cloud" : "local");
db.connect();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(helmet());
if (DOES_RATE_LIMITING) {
  app.use(limiterStop);
  app.use(limiterSlow);
}
app.use(
  mongoSanitize({
    replaceWith: "_",
  })
);

// Enable if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
// see https://expressjs.com/en/guide/behind-proxies.html
app.set("trust proxy", 1);

app.use("/api", indexRouter);

// For authentication
app.use("/api/user", userRouter);

// For strategies
app.use("/api/condition", conditionRouter);
app.use("/api/strategy", strategyRouter);
app.use("/api/portfolio", portfolioRouter);

// For backtesting & optimizer
app.use("/api/backtest", backtestRouter);
app.use("/api/optimize", optimizerRouter);

// Other
app.use("/api/search", searchRouter);
app.use("/api/stock", stockRouter);

if (process.env.NODE_ENV === "production") {
  let url = path.join(__dirname, "../client/build");
  app.use(express.static(url));

  app.get("/*", function (req, res) {
    res.sendFile(path.join(__dirname, "../client/build", "index.html"));
  });
}

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  print(`Server is starting at PORT ${PORT}`);
});

async function cleanup(_exitCode, signal) {
  print("\nShutting down");
  await Optimizer.killall(
    {},
    "Optimization process was killed by internal error"
  );
  print("Goodbye!");
  process.kill(process.pid, signal);
}

nodeCleanup(function (exitCode, signal) {
  cleanup(exitCode, signal);
  nodeCleanup.uninstall();
  return false;
});

(async () => {
  print("Turning on system.");
  const dataExists = await StockData.exists("SPY");
  if (!dataExists) {
    await StockData.update();
  }
  await ConditionFactory.initializeConditionsInDb(FORCE_UPDATE_CONDITIONS);
  const users = await User.find();
  for (let i = 0; i < users.length; i++) {
    let user = users[i];
    ForwardTest.createWorker(user);
  }
})();
