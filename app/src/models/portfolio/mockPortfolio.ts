import _, { round } from "lodash";
import { BuyOrSellEnum } from "../../utils";
import { Id } from "../abstractions/abstractModel";
import { AllocationLimit } from "../allocation";
import { IBaseLineComparison } from "../history/priceHistory";
import Order from "../order";
import Position from "../position";
import PriceMap from "../priceMap";
import Strategy from "../strategy";
import AbstractPortfolio from "./abstractPortfolio";
import {
  IComparisionHistory,
  IPortfolio,
  PAPER_CONFIG_BACKTEST,
} from "./interfaces";

class MockPortfolio extends AbstractPortfolio implements IPortfolio {
  /**
   * A class representing a mock portfolio.
   *
   * @remarks
   * This class mimics the behavior of a real portfolio, without using
   * persistence and orders. It is used for backtesting.
   */
  public _id: Id;
  public maximumAllocation: AllocationLimit;
  public minimumAllocation: AllocationLimit;
  public valueHistory: Array<{ time: Date; value: number }>;
  public deltaValueHistory: Array<{ time: Date; value: number }>;
  public positionHistory: Array<{ time: Date; value: Position[] }>;
  public comparisonHistory: Array<IComparisionHistory>;

  constructor(obj: IPortfolio) {
    super(obj);
    this.valueHistory = [];
    this.deltaValueHistory = [];
    this.positionHistory = [];
    this.comparisonHistory = [];
  }

  public reset() {
    this.valueHistory = [];
    this.deltaValueHistory = [];
    this.positionHistory = [];
    this.comparisonHistory = [];
    this.buyingPower = this.initialValue;
    this.lastPurchaseDate = null;
    this.lastSaleDate = null;
    this.positions = [];
    this.commissionPaid = 0;
  }

  public updateHistory(priceMap: PriceMap, currentDate: Date): void {
    const positions = _.cloneDeep(this.positions);
    const d = _.cloneDeep(currentDate);
    const currentValue = this.calculateValue(priceMap);
    const lastValue =
      this.valueHistory.length > 0
        ? this.valueHistory[this.valueHistory.length - 1].value
        : this.initialValue;
    this.positionHistory.push({
      time: d,
      value: positions,
    });
    this.valueHistory.push({
      time: d,
      value: currentValue,
    });
    this.deltaValueHistory.push({
      time: d,
      value: currentValue - lastValue,
    });
  }

  public generateBaselineComparison(obj: IBaseLineComparison) {
    const { brokerage, comparisonAsset, frequency } = obj;
    if (this.valueHistory.length === 0) return;
    const d = _.cloneDeep(this.valueHistory[0].time);
    const priceMap = brokerage.getBacktestPrices(d, frequency);
    const baselinePrice = priceMap.getDynamicPrice(
      comparisonAsset,
      BuyOrSellEnum.BUY
    );
    const initialNumShares = round(this.initialValue / baselinePrice, 5);
    const comissionVal = super.getCommissionConfig(
      comparisonAsset.type,
      this.config.commission
    );
    const commission = this.calculateCommission(
      initialNumShares,
      baselinePrice,
      comissionVal
    );
    const value = initialNumShares * baselinePrice - commission;
    const position = new Position({
      ...comparisonAsset,
      quantity: initialNumShares,
      lastPrice: baselinePrice,
    });
    this.comparisonHistory.push({
      time: d,
      value: value,
      position: position,
      buyingPower: value - commission - this.initialValue,
    });
    for (let i = 1; i < this.valueHistory.length; i++) {
      const d = _.cloneDeep(this.valueHistory[i].time);
      const priceMap = brokerage.getBacktestPrices(d, frequency);
      const price = priceMap.getDynamicPrice(
        comparisonAsset,
        BuyOrSellEnum.BUY
      );
      const buyingPower = this.comparisonHistory[i - 1].buyingPower;
      const position = _.cloneDeep(this.comparisonHistory[i - 1].position);
      position.lastPrice = price;
      const numShares = position.quantity;
      this.comparisonHistory.push({
        time: d,
        value: price * numShares + buyingPower,
        position: position,
        buyingPower: buyingPower,
      });
    }
  }

  public buy(order: Order) {
    this.updateBoughtPosition(order);
    this.chargeCommission(order);
  }

  public sell(order: Order) {
    this.updateSellPosition(order);
    this.chargeCommission(order);
  }

  public setStrategies(strategies: Strategy[]) {
    this.strategies = strategies;
  }

  public getStrategies(): Strategy[] {
    return this.strategies;
  }

  public addStrategy(s: Strategy): void {
    this.strategies.push(s);
  }

  static newBacktest(portfolio: AbstractPortfolio): MockPortfolio {
    return new MockPortfolio({
      _id: portfolio._id,
      userId: portfolio.userId,
      name: portfolio.name,
      initialValue: portfolio.initialValue,
      buyingPower: portfolio.initialValue,
      strategies: _.cloneDeep(portfolio.strategies),
      liveTradeConfig: PAPER_CONFIG_BACKTEST,
      paperConfig: PAPER_CONFIG_BACKTEST,
    });
  }
}

export default MockPortfolio;
