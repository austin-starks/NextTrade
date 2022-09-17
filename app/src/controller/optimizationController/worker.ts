import { workerData } from "worker_threads";
import BrokergeFactory from "../../models/brokerage";
import Optimizer from "../../models/optimization";
import Db from "../../services/db";

const db = new Db(process.env.NODE_ENV === "production" ? "cloud" : "local");

(async () => {
  await db.connect();
  const optimizer = await Optimizer.findOne(
    workerData.optimizerId,
    workerData.userId,
    BrokergeFactory.create(workerData.brokerage)
  );
  await optimizer.run();
})();
