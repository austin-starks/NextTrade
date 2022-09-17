import _ from "lodash";
import { randrange, ValidationError } from "../../utils";
import {
  AssetTypeEnum,
  BuyOrSellEnum,
  DeploymentEnum,
  PercentOrDollarsEnum,
} from "../../utils/enums";
import { Id } from "../abstractions/abstractModel";
import { AllocationLimit } from "../allocation";
import AbstractFactory, { AbstractAsset, DebitSpread, Option } from "../asset";
import { AbstractCondition } from "../conditions";
import CompoundCondition from "../conditions/compound";
import NumberField from "../field/number";
import Order from "../order";
import Position from "../position";
import PriceMap from "../priceMap";
import Strategy from "../strategy";
import Time from "../time";
import {
  ICommission,
  ICommissionVal,
  IPortfolio,
  ITradingConfig,
  LIVE_CONFIG_DEFAULT,
  PAPER_CONFIG_DEFAULT,
} from "./interfaces";

abstract class AbstractPortfolio implements IPortfolio {
  _id: Id;
  lastPurchaseDate: Date;
  lastSaleDate: Date;
  buyingPower: number;
  commissionPaid: number;
  createdAt: Date;
  maximumAllocation: AllocationLimit;
  minimumAllocation: AllocationLimit;
  userId: Id;
  name: string;
  initialValue: number;
  liveTradeConfig: ITradingConfig;
  paperConfig: ITradingConfig;
  main: boolean;
  deployment: DeploymentEnum;
  active: boolean;
  positions: Position[];
  strategies: Strategy[];
  version?: number;

  protected constructor(obj: IPortfolio) {
    if (obj._id) {
      this._id = obj._id;
    }
    this.userId = obj?.userId;
    this.name = obj?.name;
    this.initialValue = obj?.initialValue || 0;
    this.buyingPower = obj?.buyingPower || obj?.initialValue || 0;
    this.commissionPaid = 0;
    this.createdAt = new Date();
    this.maximumAllocation =
      obj?.maximumAllocation || AllocationLimit.MAX_DEFAULT;
    this.minimumAllocation =
      obj?.minimumAllocation || AllocationLimit.MIN_DEFAULT;
    this.liveTradeConfig = obj?.liveTradeConfig || LIVE_CONFIG_DEFAULT;
    this.paperConfig = obj?.paperConfig || PAPER_CONFIG_DEFAULT;
    this.deployment = obj?.deployment || DeploymentEnum.PAPER;
    this.main = _.isNil(obj?.main) ? false : obj.main;
    this.active = _.isNil(obj?.active) ? false : obj.active;
    this.positions = (obj?.positions || []).map((pos) => new Position(pos));
    this.strategies = (obj?.strategies || []).map((s) => new Strategy(s));
    this.version = obj?.version || 0;
  }

  public get config() {
    let config: ITradingConfig;
    if (this.deployment === DeploymentEnum.LIVE) {
      config = this.liveTradeConfig;
    } else {
      config = this.paperConfig;
    }
    return config;
  }

  abstract setStrategies(strategies: Strategy[]): void;

  abstract getStrategies(): Strategy[];

  abstract addStrategy(s: Strategy): void;

  abstract updateHistory(
    priceMap: PriceMap,
    currentDate?: Date,
    currentTime?: Time
  ): void;

  public addStrategies(strategies: Strategy[]) {
    for (let i = 0; i < strategies.length; i++) {
      this.addStrategy(strategies[i]);
    }
  }

  protected _updatePositions(order: Order): { commission: number } {
    if (order.side === BuyOrSellEnum.BUY) {
      this.updateBoughtPosition(order);
    } else {
      this.updateSellPosition(order);
    }
    const commission = this.chargeCommission(order);
    return { commission };
  }

  public calculatePositionValue(priceMap: PriceMap) {
    let positions = this.positions;
    let value = 0;
    for (let i = 0; i < positions.length; i++) {
      let position = positions[i];
      let price = priceMap.getPositionPrice(position);
      value += price * positions[i].quantity;
    }
    return value;
  }

  public calculateInitialPositionValue(asset: AbstractAsset) {
    let positions = this.positions;
    let value = 0;
    for (let i = 0; i < positions.length; i++) {
      let position = positions[i];
      if (asset.symbol === position.symbol) {
        let price = position.averageCost;
        value += price * positions[i].quantity;
      }
    }
    return value;
  }

  // returns true if strategy contains the position with symbol=symbol
  public containsPosition(symbol: string) {
    return this.getPositionIndex(symbol) !== -1;
  }

  public containsPositionName(name: string) {
    for (let i = 0; i < this.positions.length; i++) {
      let pos = this.positions[i];
      if (pos.name === name) {
        return true;
      }
    }
    return false;
  }

  protected getPositionIndex(symbol: string) {
    return this.positions.findIndex((pos) => pos.symbol === symbol);
  }

  protected updateBoughtPosition(order: Order) {
    let { asset } = order;
    if (asset.type === AssetTypeEnum.DEBIT_SPREAD) {
      this.addDebitSpread(order);
    } else {
      this.addStandardPosition(order);
    }
    this.lastPurchaseDate = new Date();
  }

  protected updateSellPosition(order: Order) {
    const quantity = order.quantity;
    const price = order.price;
    const posInd = this.getPositionIndex(order.asset.symbol);
    const { name, symbol, type } = order.asset;
    this.subtractPositionHelper(name, symbol, type, quantity, posInd, price);
    this.buyingPower += quantity * price;
    this.lastSaleDate = new Date();
  }

  protected addDebitSpread(order: Order) {
    let { long, short } = order.asset as DebitSpread;
    let longInd = this.getPositionIndex(long.symbol);
    let shortInd = this.getPositionIndex(short.symbol);
    let longPrice = order.otherData["long"];
    let shortPrice = order.otherData["short"];
    this.addPositionHelper(
      long.name,
      long.symbol,
      long.type,
      order.quantity,
      longInd,
      longPrice
    );
    this.subtractPositionHelper(
      short.name,
      short.symbol,
      short.type,
      order.quantity,
      shortInd,
      shortPrice
    );
    this.buyingPower -= order.quantity * order.price;
  }

  protected addStandardPosition(order: Order) {
    let posInd = this.getPositionIndex(order.asset.symbol);
    let { quantity, price } = order;

    const { name, symbol, type } = order.asset;
    this.addPositionHelper(name, symbol, type, order.quantity, posInd, price);
    this.buyingPower -= quantity * price;
  }

  protected addPositionHelper(
    name: string,
    symbol: string,
    type: AssetTypeEnum,
    quantity: number,
    posInd: number,
    price: number
  ) {
    if (posInd === -1) {
      this.positions.push(
        new Position({
          name: name,
          symbol: symbol,
          type: type,
          lastPrice: price,
          quantity: quantity,
        })
      );
    } else {
      this.positions[posInd].addPositions(quantity, price);
    }
  }

  protected subtractPositionHelper(
    name: string,
    symbol: string,
    type: AssetTypeEnum,
    quantity: number,
    posInd: number,
    price: number
  ) {
    if (posInd === -1) {
      this.positions.push(
        new Position({
          name: name,
          symbol: symbol,
          type: type,
          lastPrice: price,
          quantity: -1 * quantity,
        })
      );
    } else {
      this.positions[posInd].subtractPositions(quantity, price);
      // if amount === 0, splice position from array
      if (this.positions[posInd].quantity === 0) {
        this.positions.splice(posInd, 1);
      }
    }
  }

  protected getCommissionConfig(
    assetType: AssetTypeEnum,
    commission: ICommission
  ) {
    return assetType === AssetTypeEnum.STOCK
      ? commission.stockCommission
      : assetType === AssetTypeEnum.CRYPTO
      ? commission.cryptoCommission
      : commission.optionCommission;
  }

  protected chargeCommission(order: Order) {
    const commissionConfig = this.getCommissionConfig(
      order.asset.type,
      this.config.commission
    );
    const commission = this.calculateCommission(
      order.quantity,
      order.price,
      commissionConfig
    );
    this.buyingPower -= commission;
    this.commissionPaid += commission;
    return commission;
  }

  protected calculateCommission(
    amount: number,
    price: number,
    config: ICommissionVal
  ) {
    let commission = 0;
    // if type === percent, pay commission for percent of the total amount
    if (config.type === PercentOrDollarsEnum.PERCENT) {
      if (config.val > 1) {
        throw new ValidationError("Amount should be a decimal between 0 and 1");
      }
      commission = amount * price * config.val;
    } else {
      // if type === DOLLARS, pay commission for each unit
      commission = amount * config.val;
    }
    return randrange(commission * 0.5, commission * 2, false);
  }

  public calculateValue(priceMap: PriceMap) {
    let positionValue = this.calculatePositionValue(priceMap);
    return positionValue + this.buyingPower;
  }

  public updateValue(priceMap: PriceMap) {
    // iterate over positions and make value their last value
    const length = this.positions.length;
    for (let i = 0; i < length; i++) {
      let pos = this.positions[i];
      pos.lastPrice = priceMap.getPositionPrice(pos);
    }
  }

  public deleteExpiredOptions(expirationDate = new Date()) {
    this.positions = this.positions.filter((pos) => {
      let option = AbstractFactory.createFromPosition(pos) as Option;
      if (
        (pos.type === AssetTypeEnum.OPTION ||
          pos.type === AssetTypeEnum.DEBIT_SPREAD) &&
        Option.isExpired(option, expirationDate)
      ) {
        return false;
      }
      return true;
    });
  }

  public getEarliestDatePossible() {
    const getEarliest = (condition: AbstractCondition): number => {
      let earliest = 0;
      if ("duration" in condition) {
        let field = condition.getForm().getField("duration") as NumberField;
        if (field.value === "") {
          throw new ValidationError("Duration cannot be empty");
        }
        let absDurationNumber = field.min - 1;
        if (absDurationNumber < earliest) {
          earliest = absDurationNumber;
        }
      }
      if ("conditions" in condition) {
        const compoundCondition: CompoundCondition =
          condition as CompoundCondition;
        for (const cond of compoundCondition.conditions) {
          const earliestCond = getEarliest(cond);
          if (earliestCond < earliest) {
            earliest = earliestCond;
          }
        }
      }
      return earliest;
    };

    let earliest = 0;
    for (const strategy of this.strategies) {
      const conditions = [
        ...strategy.buyingConditions,
        ...strategy.sellingConditions,
      ];
      for (const condition of conditions) {
        earliest = Math.min(earliest, getEarliest(condition));
      }
    }
    return earliest;
  }
}

export default AbstractPortfolio;
