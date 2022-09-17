import ConditionFactory from "../../../models/conditions";
import Db from "../../../services/db";
import { print } from "../../../utils";

(async () => {
  const db = new Db(process.env.NODE_ENV === "production" ? "cloud" : "local");
  print("Turning on system.");
  await db.connect();
  await ConditionFactory.initializeConditionsInDb();
  print("Done");
})();
