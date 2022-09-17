import StockDataHolder from "../../../models/asset/StockData";
import Db from "../../../services/db";
import { print } from "../../../utils";

(async () => {
  const db = new Db(process.env.NODE_ENV === "production" ? "cloud" : "local");
  print("Turning on system.");
  await db.connect();
  if (!StockDataHolder.stockDataWasDownloadedRecently()) {
    print("Downloading stock data...");
    await StockDataHolder.downloadStockData();
  }
  let stocks = await StockDataHolder.constructValidStockList();
  await StockDataHolder.saveToDb(stocks);
  print("Done");
})();
