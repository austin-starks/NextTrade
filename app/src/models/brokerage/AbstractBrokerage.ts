import ReconnectingWebSocket from "reconnecting-websocket";
import {
  Datestring,
  MarketDataArray,
  MarketHistoryDict,
  uniqId,
} from "../../utils";
import {
  AssetTypeEnum,
  BrokerageEnum,
  BuyOrSellEnum,
  DeploymentEnum,
  FillProbabilityEnum,
  OrderStatusEnum,
  OrderTypeEnum,
} from "../../utils/enums";
import { Id } from "../abstractions/abstractModel";
import { AbstractAsset, DebitSpread, Option, OptionChain } from "../asset";
import Order, { OrderConfig } from "../order";
import PriceMap, { InternalMap, PriceObj } from "../priceMap";

const STOCK_PRICE_MULTIPLIER = 1.005;
const OPTIONS_PRICE_MULTIPLIER = 1.01;
const MARKET_PRICE_MULTIPLIER = 1.02;

export interface IBrokerage {
  name: BrokerageEnum;
  authDetails: {
    token: string;
    accountId: string;
  };
  marketHistoryDict?: MarketHistoryDict;
}

export interface SearchResult {
  symbol: string;
  description: string;
}

export interface ITimesalesPoint {
  time: string;
  timestamp: number;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  price: number;
}

export default abstract class AbstractBrokerage implements IBrokerage {
  /**
   * Abstract Brokerage class that all other brokerages inherit from.
   */
  abstract name: BrokerageEnum;
  public authDetails: { token: string; accountId: string };
  public marketHistoryDict: MarketHistoryDict;

  constructor(obj: IBrokerage) {
    this.authDetails = obj.authDetails;
    this.marketHistoryDict =
      obj.marketHistoryDict || new Map<string, MarketDataArray>();
  }

  public clearMarketHistory(): void {
    this.marketHistoryDict = new Map<string, MarketDataArray>();
  }

  abstract getPrices(assets: AbstractAsset[]): Promise<InternalMap>;

  abstract getStockPriceObj(asset: AbstractAsset): Promise<PriceObj>;
  abstract getDynamicPrice(asset: AbstractAsset | string): Promise<PriceObj>;
  abstract createStream(symbols: Set<string>): Promise<ReconnectingWebSocket>;

  protected async sendPaperOrder(
    obj: OrderConfig,
    fractionalShares = false
  ): Promise<Order> {
    let id = "PAPER-" + uniqId();
    if (!fractionalShares) {
      obj.quantity = Math.floor(obj.quantity);
    }
    const order = await Order.create(id, obj);

    return order;
  }

  public async sendOrder(obj: OrderConfig): Promise<Order> {
    if (obj.portfolio.deployment === DeploymentEnum.PAPER) {
      return this.sendPaperOrder(obj);
    } else if (obj.portfolio.deployment === DeploymentEnum.LIVE) {
      return this.sendRealOrder(obj);
    } else {
      throw new Error("Unknown Deployment Style.");
    }
  }

  public getAssetString(assets: AbstractAsset[]): string {
    let symbols = "";
    let prevSet = new Set();
    for (let i = 0; i < assets.length; i++) {
      if (!prevSet.has(assets[i].symbol)) {
        symbols = symbols + assets[i].symbol;
        if (
          [AssetTypeEnum.OPTION, AssetTypeEnum.DEBIT_SPREAD].includes(
            assets[i].type
          ) &&
          !prevSet.has(assets[i].name)
        ) {
          symbols = symbols + "," + assets[i].name;
        }
        if (assets[i].type === AssetTypeEnum.DEBIT_SPREAD) {
          let ds = assets[i] as DebitSpread;
          if (!prevSet.has(ds.long.symbol)) {
            symbols = symbols + "," + ds.long.symbol;
          }
          if (!prevSet.has(ds.short.symbol)) {
            symbols = symbols + "," + ds.short.symbol;
          }
        }
        if (i < assets.length - 1) {
          symbols = symbols + ",";
        }
        prevSet.add(assets[i].symbol);
        prevSet.add(assets[i].name);
      }
    }
    return symbols;
  }

  abstract getOptionExpirationList(option: Option): Promise<Array<Datestring>>;

  abstract getOptionChain(
    option: Option,
    expirationStr: string
  ): Promise<OptionChain>;

  abstract sendRealOrder(obj: OrderConfig): Promise<Order>;

  abstract updateRealOrders(userId: Id): Promise<void>;

  public async updatePaperOrders(userId: Id, priceMap: PriceMap) {
    const unfilledOrders = await Order.find({
      userId: userId,
      acknowledged: false,
      status: OrderStatusEnum.PENDING,
      deployment: DeploymentEnum.PAPER,
    });
    for (let i = 0; i < unfilledOrders.length; i++) {
      let order = unfilledOrders[i];
      if (order.type === OrderTypeEnum.MARKET) {
        await this.updatePaperMarketOrder(order, priceMap);
      } else if (order.type === OrderTypeEnum.LIMIT) {
        await this.updatePaperLimitOrder(order, priceMap);
      }
    }
  }

  private async updatePaperMarketOrder(order: Order, priceMap: PriceMap) {
    let currentPrice = priceMap.get(
      order.asset,
      order.side,
      FillProbabilityEnum.LIKELY_TO_FILL
    );
    if (order.side === BuyOrSellEnum.BUY) {
      currentPrice = Math.min(
        currentPrice,
        order.price * MARKET_PRICE_MULTIPLIER
      );
    } else {
      currentPrice = Math.max(
        currentPrice,
        order.price / MARKET_PRICE_MULTIPLIER
      );
    }
    order.setFilled(Math.round(100 * currentPrice) / 100, new Date());
    await order.save();
  }

  private async updatePaperLimitOrder(order: Order, priceMap: PriceMap) {
    let currentPrice = priceMap.get(
      order.asset,
      BuyOrSellEnum.BUY,
      FillProbabilityEnum.MID
    );
    let modified = false;
    let price = 0;
    const multiplier =
      order.asset.type === AssetTypeEnum.OPTION
        ? OPTIONS_PRICE_MULTIPLIER
        : STOCK_PRICE_MULTIPLIER;
    if (
      order.side == BuyOrSellEnum.BUY &&
      currentPrice * multiplier < order.price
    ) {
      price = Math.min(order.price, currentPrice * multiplier);
      modified = true;
    } else if (
      order.side == BuyOrSellEnum.SELL &&
      currentPrice > multiplier * order.price
    ) {
      price = Math.max(order.price * multiplier, currentPrice);
      price = Math.round(100 * price) / 100;
      modified = true;
    }
    if (modified) {
      order.setFilled(price, new Date());
      await order.save();
    }
  }

  abstract cancelAllOrders(): Promise<void>;

  abstract getMarketHistory(
    asset: AbstractAsset | string,
    startTime: Datestring,
    endTime: Date
  ): Promise<MarketDataArray>;

  abstract getIntradayMarketHistory(
    assetName: string,
    startTime: Datestring,
    endTime: Date,
    interval: "1min" | "5min" | "15min"
  ): Promise<MarketDataArray>;
}
