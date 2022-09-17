import date from "date-and-time";
import _ from "lodash";
import {
  BrokerageEnum,
  Datestring,
  formatDate,
  MarketDataArray,
  TimeIntervalEnum,
  ValidationError,
} from "../../utils";
import { Id } from "../abstractions/abstractModel";
import { AbstractAsset, Option, OptionChain } from "../asset";
import Order, { OrderConfig } from "../order";
import PriceMap, { InternalMap, PriceObj } from "../priceMap";
import BrokergeFactory, { AbstractBrokerage, IBrokerage } from "./";

interface IBacktestBrokerage {
  getMarketHistoryCache?: Map<string, any>;
  getIntradayMarketHistoryCache?: Map<string, any>;
  savedAssets?: Set<string>;
  brokerage: AbstractBrokerage;
}

class BacktestBrokerage extends AbstractBrokerage {
  /**
   * BacktestBrokerage for Backtesting brokerages
   *
   * @remarks
   * This is a wrapper around the Backtesting Brokerage that caches the market data to avoid
   * repeated API calls. It saves the market data in-memory and returns the cached data
   *
   * This should not be used for other purposes because the data will become stale quickly.
   */
  name = BrokerageEnum.CACHED;
  brokerage: AbstractBrokerage;

  // cache is a mapping of function names to strings to
  getMarketHistoryCache: Map<
    string,
    {
      startDate: Date;
      result: MarketDataArray;
    }
  >;
  getIntradayMarketHistoryCache: Map<
    string,
    {
      startDate: Date;
      result: MarketDataArray;
    }
  >;
  savedAssets: Set<string>;
  public apiRequests = 0;
  public _API_REQUEST_LIMIT = 5;
  public static brokerageCount = 0;

  constructor(obj: IBacktestBrokerage) {
    super({
      ...obj,
      name: BrokerageEnum.CACHED,
      authDetails: obj.brokerage.authDetails,
    });
    this.brokerage = obj.brokerage;
    this.getMarketHistoryCache = new Map<string, any>(
      obj.getMarketHistoryCache
    );
    this.getIntradayMarketHistoryCache = new Map<string, any>(
      obj.getIntradayMarketHistoryCache
    );
    this.savedAssets = new Set<string>(obj.savedAssets);
  }

  static create(brokerage: IBrokerage): BacktestBrokerage {
    return new BacktestBrokerage({
      brokerage: BrokergeFactory.create(brokerage),
      getMarketHistoryCache: new Map<string, any>(),
      getIntradayMarketHistoryCache: new Map<string, any>(),
      savedAssets: new Set<string>(),
    });
  }

  public getInternalBrokerage(): AbstractBrokerage {
    return this.brokerage;
  }

  async getPrices(assets: AbstractAsset[]): Promise<InternalMap> {
    return this.brokerage.getPrices(assets);
  }

  async getStockPriceObj(asset: AbstractAsset): Promise<PriceObj> {
    return this.brokerage.getStockPriceObj(asset);
  }

  async getDynamicPrice(asset: string | AbstractAsset): Promise<PriceObj> {
    return this.brokerage.getDynamicPrice(asset);
  }

  async getOptionExpirationList(
    option: Option
  ): Promise<
    `${number}${number}${number}${number}-${number}${number}-${number}${number}`[]
  > {
    return this.brokerage.getOptionExpirationList(option);
  }

  async getOptionChain(
    option: Option,
    expirationStr: string
  ): Promise<OptionChain> {
    return this.brokerage.getOptionChain(option, expirationStr);
  }

  async sendRealOrder(obj: OrderConfig): Promise<Order> {
    return this.brokerage.sendRealOrder(obj);
  }

  async updateRealOrders(userId: Id): Promise<void> {
    return this.brokerage.updateRealOrders(userId);
  }

  async cancelAllOrders(): Promise<void> {
    return this.brokerage.cancelAllOrders();
  }

  async getMarketHistory(
    asset: string | AbstractAsset,
    startTime: Datestring,
    endTime: Date
  ): Promise<MarketDataArray> {
    const symbol = typeof asset === "string" ? asset : asset.symbol;
    const cachedData = this.getMarketHistoryCache.get(symbol);
    if (
      !cachedData ||
      cachedData.startDate > new Date(startTime + "T00:00:00.000Z")
    ) {
      const result = await this.brokerage.getMarketHistory(
        asset,
        startTime,
        new Date()
      );
      this.apiRequests++;
      this.savedAssets.add(symbol);
      this._API_REQUEST_LIMIT = 5 * this.savedAssets.size;
      if (this.apiRequests > this._API_REQUEST_LIMIT) {
        throw new ValidationError("Too many API requests");
      }
      if (
        !result ||
        result.length === 0 ||
        Math.abs(
          date.subtract(new Date(result[0].date), new Date(startTime)).toDays()
        ) > 5
      ) {
        throw new ValidationError("Data start date does not match");
      }
      this.getMarketHistoryCache.set(symbol, {
        startDate: new Date(startTime + "T00:00:00.000Z"),
        result,
      });
      return this.filterCachedData(result, startTime, endTime);
    }
    return this.filterCachedData(cachedData.result, startTime, endTime);
  }

  async getIntradayMarketHistory(
    symbol: string,
    startTime: `${number}${number}${number}${number}-${number}${number}-${number}${number}`,
    endTime: Date,
    interval: "1min" | "5min" | "15min"
  ): Promise<MarketDataArray> {
    const cachedData: {
      startDate: Date;
      result: MarketDataArray;
    } = this.getIntradayMarketHistoryCache.get(symbol);
    if (!cachedData) {
      const result = await this.brokerage.getIntradayMarketHistory(
        symbol,
        startTime,
        endTime,
        interval
      );
      this.apiRequests++;
      this.savedAssets.add(symbol);
      if (this.apiRequests > this._API_REQUEST_LIMIT) {
        throw new ValidationError("Too many API requests");
      }
      this.getIntradayMarketHistoryCache.set(symbol, {
        startDate: new Date(startTime),
        result,
      });
      this._API_REQUEST_LIMIT = 5 * this.savedAssets.size;
      return result;
    }
    if (cachedData.startDate > new Date(startTime)) {
      throw new Error("Cached data is older than start time");
    }
    return this.filterCachedData(cachedData.result, startTime, endTime);
  }

  getBacktestPrices(d: Date, interval: TimeIntervalEnum): PriceMap {
    const priceMap = new PriceMap();
    if (interval === TimeIntervalEnum.DAY) {
      this.savedAssets.forEach((symbol) => {
        const priceObj = this.getBacktestDailyPriceObj(d, symbol);
        priceMap.set(symbol, priceObj);
      });
    } else {
      this.savedAssets.forEach((symbol) => {
        const priceObj = this.getBacktestIntradayPriceObj(d, symbol);
        priceMap.set(symbol, priceObj);
      });
    }
    return priceMap;
  }

  getBacktestDailyPriceObj(d: Date, symbol: string): PriceObj {
    let time = "open";
    if (d.getHours() > 15) {
      time = "close";
    }
    const cachedValue = this.getMarketHistoryCache.get(symbol);
    const marketData = cachedValue.result;
    let dataPoint = marketData.find((obj) => obj.date === formatDate(d));
    if (!dataPoint) {
      throw new ValidationError(
        "No data found for date " + d.toString() + ", symbol " + symbol
      );
    }
    let volume = 0;
    if (time === "close") {
      volume = dataPoint.volume;
    }
    const priceObj: PriceObj = {
      bid: dataPoint[time] * 0.99,
      mid: dataPoint[time],
      ask: dataPoint[time] * 1.01,
      open: dataPoint.open,
      close: dataPoint[time],
      high: time === "open" ? dataPoint["open"] : dataPoint.high,
      low: time === "open" ? dataPoint["open"] : dataPoint.low,
      volume: volume,
    };
    return priceObj;
  }

  getBacktestIntradayPriceObj(d: Date, symbol: string): PriceObj {
    throw new Error("Method not implemented.");
  }

  filterCachedData(result: MarketDataArray, startTime: string, endTime: Date) {
    const finalResult = _.cloneDeep(
      result.filter((dp) => {
        const d = new Date(dp.date);
        return d >= date.addDays(new Date(startTime), -1) && d <= endTime;
      })
    );
    if (endTime.getHours() === 9 && endTime.getMinutes() === 30) {
      // const lastElement = finalResult[finalResult.length - 1];
      // lastElement.close = lastElement.open;
      // lastElement.high = lastElement.open;
      // lastElement.low = lastElement.open;
      // lastElement.volume = finalResult[finalResult.length - 2].volume;
      finalResult.pop();
    }
    return finalResult;
  }

  createStream(symbols: Set<string>) {
    return this.brokerage.createStream(symbols);
  }
}

export default BacktestBrokerage;
