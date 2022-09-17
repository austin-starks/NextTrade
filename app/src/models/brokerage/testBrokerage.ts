import date from "date-and-time";
import { Datestring, formatDate, MarketDataArray } from "../../utils";
import { BrokerageEnum, OhlcEnum } from "../../utils/enums";
import { Id } from "../abstractions/abstractModel";
import { AbstractAsset, Option } from "../asset";
import Order, { OrderConfig } from "../order";
import PriceMap, { InternalMap, PriceObj } from "../priceMap";
import AbstractBrokerage, { IBrokerage } from "./AbstractBrokerage";

interface ITestBrokerage extends IBrokerage {
  priceMap?: PriceMap;
}

export default class TestBrokerage extends AbstractBrokerage {
  /**
   * Mock Brokerage used for testing
   *
   * @remarks
   * Unlike a real brokerage (which interacts with an external API), the mock
   * brokerage is an in-memory implementation. The developer must manually
   * set the return values for each method
   */
  public name: BrokerageEnum;
  private priceMap: PriceMap;

  constructor(obj: ITestBrokerage) {
    super(obj);
    this.name = BrokerageEnum.TEST;
    this.priceMap = obj.priceMap || new PriceMap();
  }

  public cancelAllOrders(): Promise<void> {
    return Promise.resolve();
  }

  public async getMarketHistory(
    asset: AbstractAsset,
    startTime: Datestring
  ): Promise<MarketDataArray> {
    startTime;
    return this.marketHistoryDict.get(asset.symbol);
  }

  public getOptionChain(option: Option, expirationStr: string): Promise<any> {
    option;
    expirationStr;
    return Promise.resolve([]);
  }

  public updateRealOrders(userId: Id): Promise<void> {
    return Promise.resolve();
  }

  public getOptionExpirationList(option: Option): Promise<Array<Datestring>> {
    option;
    let today = new Date();
    // get to Friday
    today = date.addDays(today, today.getDay() - 5);
    const arr = [];
    for (let i = 0; i < 110; i++) {
      let strDate = formatDate(today);
      arr.push(strDate);
      today = date.addDays(today, 7);
    }
    return Promise.resolve(arr);
  }

  public setPriceObj(asset: AbstractAsset, priceObj: PriceObj) {
    this.priceMap.set(asset.symbol, priceObj);
  }

  public setPrice(asset: AbstractAsset, price: number) {
    this.priceMap.set(asset.symbol, {
      bid: price,
      ask: price,
      mid: price,
      open: price,
      high: price,
      low: price,
      close: price,
    });
  }
  public async getPrices(assets: AbstractAsset[]): Promise<InternalMap> {
    const tmpMap = new Map<string, PriceObj>();
    assets.forEach((asset) => {
      if (!this.priceMap.contains(asset.symbol)) {
        throw new Error("Price not found for " + asset.symbol);
      }
      tmpMap.set(asset.symbol, this.priceMap.getPriceObj(asset));
    });
    return Promise.resolve(tmpMap);
  }

  public async getDynamicPrice(asset: AbstractAsset) {
    return null;
  }

  public async getStockPriceObj(asset: AbstractAsset): Promise<PriceObj> {
    if (!this.priceMap.contains(asset)) {
      this.setPrice(asset, 50);
    }
    return Promise.resolve(this.priceMap.getStockPriceObj(asset));
  }

  public constructFakeMarketDict(
    asset: AbstractAsset,
    mockData: Array<number>,
    ohlc: OhlcEnum
  ) {
    this.marketHistoryDict.set(asset.symbol, []);
    let time = date.addDays(new Date(), -mockData.length);
    for (let i = 0; i < mockData.length; i++) {
      let obj: any = {};
      obj[ohlc] = mockData[i];
      obj["date"] = formatDate(time);
      let arr = this.marketHistoryDict.get(asset.symbol);
      arr.push(obj);
      time = date.addDays(time, 1);
    }
  }

  public constructRealisticMarketDict(
    asset: AbstractAsset,
    mockData: MarketDataArray
  ) {
    this.marketHistoryDict.set(asset.symbol, mockData);
  }

  public async sendOrder(obj: OrderConfig): Promise<Order> {
    return this.sendPaperOrder(obj);
  }

  public async sendRealOrder(obj: OrderConfig): Promise<Order> {
    return this.sendPaperOrder(obj);
  }

  public getIntradayMarketHistory(
    _assetName: string,
    _startTime: `${number}${number}${number}${number}-${number}${number}-${number}${number}`,
    _endTime: Date,
    _interval: "1min" | "5min" | "15min"
  ): Promise<MarketDataArray> {
    throw new Error("Method not implemented.");
  }

  async createStream(_symbols: Set<string>) {
    return null;
  }
}

export class TestBrokerageWithMarketHistorySpy extends TestBrokerage {
  public getMarketHistoryCount: number;

  constructor(obj: IBrokerage) {
    super({ ...obj });
    this.name = BrokerageEnum.TEST_WITH_MARKET_HISTORY_SPY;
    this.getMarketHistoryCount = 0;
  }

  public async getMarketHistory(asset: AbstractAsset, startTime: Datestring) {
    this.getMarketHistoryCount++;
    return super.getMarketHistory(asset, startTime);
  }

  public getIntradayMarketHistory(
    _assetName: string,
    _startTime: `${number}${number}${number}${number}-${number}${number}-${number}${number}`,
    _endTime: Date,
    _interval: "1min" | "5min" | "15min"
  ): Promise<MarketDataArray> {
    throw new Error("Method not implemented.");
  }

  public async createStream() {
    return null;
  }
}
