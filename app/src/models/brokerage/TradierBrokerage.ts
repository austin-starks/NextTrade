import axios, { AxiosInstance } from "axios";
import { Types } from "mongoose";
import ReconnectingWebSocket from "reconnecting-websocket";
import {
  Datestring,
  debug,
  formatDate,
  MarketDataArray,
  print,
} from "../../utils";
import { BrokerageEnum } from "../../utils/enums";
import { Option } from "../asset";
import AbstractAsset from "../asset/AbstractAsset";
import Order, { OrderConfig } from "../order";
import { InternalMap, PriceObj } from "../priceMap";
import AbstractBrokerage, {
  IBrokerage,
  ITimesalesPoint,
} from "./AbstractBrokerage";

class TradierBrokerage extends AbstractBrokerage {
  /**
   * Brokerage that uses the Tradier API
   */
  private request: AxiosInstance;
  public name: BrokerageEnum;
  constructor(obj: IBrokerage) {
    super(obj);
    // real URL for non-sandbox:
    // https://api.tradier.com
    this.request = axios.create({
      baseURL: "https://sandbox.tradier.com/v1/",
      headers: {
        Authorization: "Bearer " + this.authDetails.token,
        Accept: "application/json",
      },
    });
    this.name = BrokerageEnum.TRADIER;
  }

  public async getOptionExpirationList(
    option: Option
  ): Promise<Array<Datestring>> {
    return this.request
      .get("/markets/options/expirations", {
        params: { symbol: option.name, includeAllRoots: true, strikes: true },
      })
      .then((res) => {
        return res.data.expirations.expiration.map((expiration: unknown) => {
          return expiration["date"];
        });
      });
  }

  public async getOptionChain(
    option: Option,
    expirationStr: string
  ): Promise<any> {
    return this.request
      .get("/markets/options/chains", {
        params: {
          symbol: option.name,
          expiration: expirationStr,
          greeks: true,
        },
      })
      .then((res) => res.data.options.option);
  }

  public async getMarketHistory(
    asset: AbstractAsset | string,
    startTime: Datestring,
    endTime: Date
  ): Promise<MarketDataArray> {
    let name: string;
    if (typeof asset === "string") {
      name = asset;
    } else {
      name = asset.symbol;
    }
    let req = await this.request.get("/markets/history", {
      params: {
        symbol: name,
        interval: "daily",
        start: startTime,
        end: formatDate(endTime),
      },
    });
    if (req.status !== 200 || !req.data.history) {
      return [];
    }
    let history = req.data.history.day;
    if (!Array.isArray(history)) {
      history = [history];
    }
    return history;
  }

  public async getIntradayMarketHistory(
    asset: AbstractAsset | string,
    startTime: Datestring,
    _endTime: Date,
    interval: "1min" | "5min" | "15min"
  ): Promise<MarketDataArray> {
    let name: string;
    if (typeof asset === "string") {
      name = asset;
    } else {
      name = asset.symbol;
    }
    let req = await this.request.get("/markets/timesales", {
      params: {
        symbol: name,
        interval: interval,
        start: `${startTime} 09:30`,
        session_filter: "open",
      },
    });
    if (req.status !== 200 || !req.data.series || !req.data.series.data) {
      return [];
    }
    return req.data.series.data.map((dp: ITimesalesPoint) => {
      return { ...dp, date: dp.time };
    });
  }

  public async getStockPriceObj(asset: AbstractAsset): Promise<PriceObj> {
    let symbol = asset.name;
    return this.request
      .get(`markets/quotes?symbols=${symbol}&greeks=true`)
      .then((res) => {
        let quote = res.data.quotes.quote;
        return {
          bid: quote.bid,
          mid: (quote.bid + quote.ask) / 2,
          ask: quote.ask,
          open: quote.open,
          high: quote.high,
          low: quote.low,
          close: quote.close,
        };
      });
  }

  public async getPrices(assets: AbstractAsset[]): Promise<InternalMap> {
    let assetDict = new Map<string, PriceObj>();
    let symbols: string = this.getAssetString(assets);
    if (!symbols) {
      return assetDict;
    }
    // refactor: can stream prices to class and return the most recent
    const response = await this.request.get(
      `markets/quotes?symbols=${symbols}&greeks=true`
    );
    let quote = response.data.quotes.quote;
    if (!Array.isArray(quote)) {
      quote = [quote];
    }
    for (let i = 0; i < quote.length; i++) {
      assetDict.set(quote[i].symbol, {
        bid: quote[i].bid,
        mid: (quote[i].bid + quote[i].ask) / 2,
        ask: quote[i].ask,
        open: quote[i].open,
        high: quote[i].high,
        low: quote[i].low,
        close: quote[i].close,
      });
    }
    return assetDict;
  }

  public async getDynamicPrice(asset: AbstractAsset | string) {
    const symbol = typeof asset === "string" ? asset : asset.symbol;
    const response = await this.request.get(
      `markets/quotes?symbols=${symbol}&greeks=false`
    );
    let quote = response.data.quotes.quote;
    if (Array.isArray(quote)) {
      quote = quote[0];
    }
    return {
      bid: quote.bid,
      mid: (quote.bid + quote.ask) / 2,
      ask: quote.ask,
      open: quote.open,
      high: quote.high,
      low: quote.low,
      close: quote.close,
    };
  }

  public async sendRealOrder(obj: OrderConfig): Promise<Order> {
    if (new Date().toString() !== "Bob Builder") {
      throw new Error("Should be paper trading right now.");
    }
    const config = obj.portfolio.liveTradeConfig;
    const accountId = "";
    const response = await this.request.post(`accounts/${accountId}/orders`, {
      class: obj.asset.getClass(),
      symbol: obj.asset.name,
      side: obj.side,
      quantity: Math.floor(obj.quantity),
      type: config.orderType,
      duration: "day",
      price: obj.price,
      tag: obj.strategy.id,
    });
    const id = response["order"]["id"];
    const order = await Order.create(id, obj);

    return order;
  }

  protected async sendPaperOrder(obj: OrderConfig): Promise<Order> {
    return super.sendPaperOrder(obj, true);
  }

  public updateRealOrders(userId: Types.ObjectId): Promise<void> {
    // // TODO: Get request in all active orders
    // // iterate over results and change the status of all orders in DB
    // const token = user.portfolioInfo.brokerage.authDetails.token;
    // const accountId = user.portfolioInfo.brokerage.authDetails.accountId;
    // const response = request(
    //   {
    //     method: "get",
    //     url: `https://sandbox.tradier.com/v1/accounts/${accountId}/orders`,
    //     qs: {
    //       includeTags: "true",
    //     },
    //     headers: {
    //       Authorization: "Bearer " + token,
    //       Accept: "application/json",
    //     },
    //   },
    //   (error, response, body) => {
    //     print(error);
    //     print(response.statusCode);
    //     print(body);
    //   }
    // );
    // const orderArr = response["orders"]["order"];
    // // Get all orders from DB that are pending
    // // Update the status of them all
    // // Also, don't forget to charge commission ($0.30/options contract)
    // print(orderArr);
    userId;
    return Promise.resolve();
  }

  public cancelAllOrders(): Promise<void> {
    // TODO: Get all orders with resolved=false
    // for each order, cancel it
    return Promise.resolve();
  }

  public async getCalendar(month: number, year: number): Promise<any> {
    try {
      const response = await this.request.get(
        `markets/calendar?month=${month}&year=${year}`
      );
      if (response.status !== 200) {
        throw new Error(
          `Response status: ${response.status}; throwing Error...`
        );
      }
      return response;
    } catch (e) {
      console.error(e);
    }
  }

  public async createStream(symbols: Set<string>) {
    try {
      const response = await this.request.post(`markets/events/session`);
      if (response.status !== 200) {
        throw new Error(
          `Response status: ${response.status}; throwing Error...`
        );
      }
      const { sessionId, url } = response.data.stream;
      const websocket = new ReconnectingWebSocket(url);
      websocket.addEventListener("open", function open() {
        print("Connected, sending subscription commands...");
        websocket.send(
          `{"symbols": ${[
            ...symbols,
          ]}, "sessionid": "${sessionId}", "linebreak": true}`
        );
      });
      websocket.addEventListener("message", function incoming(data) {
        print(data);
      });
      websocket.addEventListener("error", function error(data) {
        debug(data);
      });
      return websocket;
    } catch (e) {
      console.error(e);
    }
  }
}

export default TradierBrokerage;
