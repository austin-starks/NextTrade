import axios, { AxiosInstance } from "axios";
import ReconnectingWebSocket from "reconnecting-websocket";
import { AbstractBrokerage, IBrokerage } from ".";
import { Datestring, MarketDataArray } from "../../utils";
import { BrokerageEnum } from "../../utils/enums";
import { Id } from "../abstractions/abstractModel";
import { AbstractAsset, Option, OptionChain } from "../asset";
import Order, { OrderConfig } from "../order";
import { InternalMap, PriceObj } from "../priceMap";

class CoinbaseBrokerage extends AbstractBrokerage {
  /**
   * Brokerage that uses the Alpaca API
   */
  public name: BrokerageEnum;
  public request: AxiosInstance;
  constructor(
    obj: IBrokerage = {
      name: BrokerageEnum.COINBASE,
      authDetails: {
        token: process.env.COINBASE_TOKEN,
        accountId: process.env.COINBASE_ACCOUNT_ID,
      },
    }
  ) {
    super(obj);
    this.request = axios.create({
      baseURL: "https://data.sandbox.alpaca.markets/v2/",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${obj.authDetails.token}`,
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
    throw new Error("Method not implemented.");
  }

  public getOptionChain(
    option: Option,
    expirationStr: string
  ): Promise<OptionChain> {
    option;
    expirationStr;
    throw new Error("Method not implemented.");
  }

  public updateRealOrders(userId: Id): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public getOptionExpirationList(option: Option): Promise<Array<Datestring>> {
    throw new Error("Method not implemented.");
  }

  public async getPrices(assets: AbstractAsset[]): Promise<InternalMap> {
    throw new Error("Method not implemented.");
  }
  public async getDynamicPrice(asset: AbstractAsset): Promise<PriceObj> {
    throw new Error("Method not implemented.");
  }

  public async getStockPriceObj(asset: AbstractAsset): Promise<PriceObj> {
    throw new Error("Method not implemented.");
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

export default CoinbaseBrokerage;
