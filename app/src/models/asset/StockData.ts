import appRoot from "app-root-path";
import fs from "fs";
import ftp from "ftp-get";
import { model, Schema } from "mongoose";
import { formatDate, print } from "../../utils";
import SearchHelper from "../abstractions/searchHelper";

interface IStock {
  description: string;
  name: string;
  symbol: string;
}

const stockDataSchema = new Schema({
  symbol: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
});

interface IStockData {
  symbol: string;
  name: string;
  description: string;
}

interface IStockDataDocument extends IStockData, Document {}

const StockDataModel = model<IStockDataDocument>("Stock", stockDataSchema);

export default class StockData {
  public static validStockSet: Set<String> = new Set();
  private static getStocksFromFile(filename: string): string {
    let stocks: string;
    stocks = fs.readFileSync(appRoot + "/" + filename, "utf-8");
    return stocks;
  }

  public static async exists(name: string): Promise<boolean> {
    return await StockDataModel.exists({ name: name.toUpperCase() });
  }

  public static async saveToDb(stocks: IStock[]) {
    let promises = [];
    for (let i = 0; i < stocks.length; i++) {
      let stock = stocks[i];
      let stockData = new StockDataModel({
        symbol: stock.symbol,
        name: stock.name,
        description: stock.description,
      });
      let promise = stockData.save();
      promises.push(promise);
    }
    await Promise.all(promises);
  }

  public static async downloadStockData(): Promise<void> {
    const fileList = ["nasdaqlisted.txt", "otherlisted.txt"];
    print("DOWNLOADING ALL STOCKS...");
    for (let i = 0; i < fileList.length; i++) {
      try {
        let fileLocation = appRoot + "/data/" + fileList[i];
        let url = "ftp://ftp.nasdaqtrader.com/symboldirectory/" + fileList[i];
        await ftp.get(url, fileLocation, (err: Error) => {
          if (err) {
            console.error(err);
          }
        });
      } catch (e) {
        console.error(e);
      }
    }
    fs.writeFileSync(
      appRoot + "/data/lastdownload.txt",
      formatDate(new Date())
    );
    print("Download complete.");
  }

  public static stockDataWasDownloadedRecently(): boolean {
    try {
      const dateString: string = fs.readFileSync(
        appRoot + "/data/lastdownload.txt",
        "utf-8"
      );
      const lastDownloadDate: Date = new Date(dateString);
      lastDownloadDate.setDate(lastDownloadDate.getDate() + 7);
      return lastDownloadDate > new Date();
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  public static async update() {
    this.constructValidStockList().then((stocks) => {
      this.saveToDb(stocks);
    });
  }

  public static async constructValidStockList(): Promise<IStock[]> {
    if (!StockData.stockDataWasDownloadedRecently()) {
      await StockData.downloadStockData();
    }
    const nasdaq: string = StockData.getStocksFromFile("data/nasdaqlisted.txt");
    const other: string = StockData.getStocksFromFile("data/otherlisted.txt");
    const re = /[^|]+|[^|]+/gm;
    const combined = nasdaq.split("\n").concat(other.split("\n"));
    return combined
      .map((line) => {
        const match = line.match(re);
        if (match) {
          return { description: match[1], symbol: match[0], name: match[0] };
        }
        return { description: "", symbol: "", name: "" };
      })
      .filter((stock) => stock.symbol.length > 1 && stock.symbol.length <= 5);
  }

  public static async isValidStock(symbol: string): Promise<boolean> {
    if (
      this.validStockSet.size === 0 ||
      !this.stockDataWasDownloadedRecently()
    ) {
      let stockList = await this.constructValidStockList();

      this.validStockSet = new Set(stockList.map((stock) => stock.symbol));
      this.validStockSet.delete("Symbol");
    }
    return this.validStockSet.has(symbol);
  }

  public static async searchQueryInModel(query: string, limit: number) {
    const search = new SearchHelper(StockDataModel);
    const filter = {};
    const returnedFields = ["symbol", "description", "name"];
    const queriedFields = ["name", "description"];
    return search.searchQueryInModel(
      query,
      limit,
      filter,
      returnedFields,
      queriedFields
    );
  }
}
