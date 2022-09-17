import { workerData } from "worker_threads";
import Backtester from "../../models/backtester";
import Db from "../../services/db";

const db = new Db(process.env.NODE_ENV === "production" ? "cloud" : "local");

(async () => {
  await db.connect();
  const backtester = await Backtester.findOne(
    workerData.backtestId,
    workerData.userId
  );
  await backtester.run({ saveOnRun: true, generateBaseline: true });
})();
