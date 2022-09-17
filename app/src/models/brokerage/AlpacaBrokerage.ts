import axios, { AxiosInstance } from "axios";
import ReconnectingWebSocket from "reconnecting-websocket";
import { AbstractBrokerage, IBrokerage } from ".";
import { Datestring, formatDate, MarketDataArray } from "../../utils";
import { BrokerageEnum } from "../../utils/enums";
import { Id } from "../abstractions/abstractModel";
import { AbstractAsset, Option, OptionChain } from "../asset";
import Order, { OrderConfig } from "../order";
import { InternalMap, PriceObj } from "../priceMap";

class AlpacaBrokerage extends AbstractBrokerage {
  /**
   * Brokerage that uses the Alpaca API
   */
  public name: BrokerageEnum = BrokerageEnum.ALPACA;
  public request: AxiosInstance;
  constructor(obj: IBrokerage) {
    super(obj);
    const key = Buffer.from(
      `${process.env.ALPACA_API_KEY}:${process.env.ALPACA_API_SECRET}`
    ).toString("base64");
    this.request = axios.create({
      baseURL: "https://data.sandbox.alpaca.markets/v2/",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${key}`,
      },
    });
    this.name = BrokerageEnum.ALPACA;
  }
  public cancelAllOrders(): Promise<void> {
    return Promise.resolve();
  }

  public async getMarketHistory(
    asset: AbstractAsset,
    startTime: Datestring,
    endTime?: Date
  ): Promise<MarketDataArray> {
    let finalEndTime: Datestring;
    if (!endTime) {
      finalEndTime = formatDate(new Date());
    }
    const params = {
      start: startTime,
      end: finalEndTime,
    };
    return this.request
      .get(`/stocks/${asset.symbol}/quotes`, { params })
      .then((res) => res.data.quotes);
  }

  public getOptionChain(
    option: Option,
    expirationStr: string
  ): Promise<OptionChain> {
    option;
    expirationStr;
    return Promise.resolve([]);
  }

  public updateRealOrders(userId: Id): Promise<void> {
    return Promise.resolve();
  }

  public getOptionExpirationList(option: Option): Promise<Array<Datestring>> {
    return null;
  }

  public async getPrices(assets: AbstractAsset[]): Promise<InternalMap> {
    return null;
  }
  public async getDynamicPrice(asset: AbstractAsset) {
    return null;
  }

  public async getStockPriceObj(asset: AbstractAsset): Promise<PriceObj> {
    return null;
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

  public async createStream(
    _symbols: Set<string>
  ): Promise<ReconnectingWebSocket> {
    throw new Error("Method not implemented.");
  }
}

export default AlpacaBrokerage;
