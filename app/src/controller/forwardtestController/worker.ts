import { workerData } from "worker_threads";
import forwardtestController from ".";
import Db from "../../services/db";

const db = new Db(process.env.NODE_ENV === "production" ? "cloud" : "local");

(async () => {
  await db.connect();
  const controller = new forwardtestController(
    workerData.userId,
    workerData.brokerage
  );
  await controller.run();
})();
