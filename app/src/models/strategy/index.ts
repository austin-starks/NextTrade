import _ from "lodash";
import { Document, model, Schema, Types } from "mongoose";
import { print } from "../../utils";
import { AllocationEnum, BuyOrSellEnum } from "../../utils/enums";
import AbstractModel, { Id } from "../abstractions/abstractModel";
import SearchHelper from "../abstractions/searchHelper";
import { AllocationLimit, PurchaseAndSaleAllocation } from "../allocation";
import AssetFactory, { AbstractAsset } from "../asset";
import ConditionFactory, { AbstractCondition } from "../conditions";
import { ICondition } from "../conditions/abstract";
import Order from "../order";
import Portfolio from "../portfolio";
import PriceMap from "../priceMap";

interface IPrecondition {
  buyOrSellEnum: BuyOrSellEnum;
  priceMap: PriceMap;
  unacknowledgedOrders: Order[];
  portfolio: Portfolio;
}

export interface IStrategy {
  _id?: Id;
  name: string;
  targetAsset: AbstractAsset;
  buyAmount: PurchaseAndSaleAllocation;
  sellAmount: PurchaseAndSaleAllocation;
  userId?: Id;
  maximumAllocation?: AllocationLimit;
  minimumAllocation?: AllocationLimit;
  buyingConditions?: ICondition[];
  sellingConditions?: ICondition[];
  createdAt?: Date;
}

export interface IPrototypeStrategy {
  name: string;
  targetAsset: AbstractAsset;
}

const schema = new Schema<IStrategy>({
  name: { type: String, required: true },
  userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
  targetAsset: { type: Object, required: true },
  buyingConditions: { type: [Object], required: true, default: [] },
  sellingConditions: { type: [Object], required: true, default: [] },
  buyAmount: { type: Object, required: true },
  sellAmount: { type: Object, required: true },
  maximumAllocation: {
    type: Object,
    required: true,
    default: AllocationLimit.MAX_DEFAULT,
  },
  minimumAllocation: {
    type: Object,
    required: true,
    default: AllocationLimit.MIN_DEFAULT,
  },
  createdAt: { type: Date, default: Date.now },
});

const StrategyModel = model<IStrategy>("Strategy", schema);

type IStrategyModel = IStrategy & Document<any, any, IStrategy>;

class Strategy extends AbstractModel implements IStrategy {
  /**
   * The main strategy class
   *
   * @remarks
   * This class defines custom trading strategies. We define the buyAmount, sellAmount,
   * buyingCondiitons, sellingConditions, and targetAsset in the strategy.
   */
  _id: Id;
  name: string;
  buyAmount: PurchaseAndSaleAllocation;
  targetAsset: AbstractAsset;
  sellAmount: PurchaseAndSaleAllocation;
  userId?: Id;
  maximumAllocation?: AllocationLimit;
  minimumAllocation?: AllocationLimit;
  buyingConditions?: AbstractCondition[];
  sellingConditions?: AbstractCondition[];
  createdAt?: Date;

  constructor(obj: IStrategy) {
    super();
    if (obj) {
      this.constructNewStrategy(obj);
    }
  }

  public async save() {
    if (this._id) {
      await StrategyModel.findByIdAndUpdate(this._id, this);
      return;
    }
    const model = await StrategyModel.create(this);
    this._id = model.id;
  }

  private constructNewStrategy(obj: IStrategy) {
    this._id = obj._id;
    this.name = obj.name;
    this.targetAsset = AssetFactory.create(obj.targetAsset);
    this.buyAmount =
      obj.buyAmount ||
      new PurchaseAndSaleAllocation({
        amount: 0,
        type: AllocationEnum.DOLLARS,
      });
    this.sellAmount =
      obj.sellAmount ||
      new PurchaseAndSaleAllocation({
        amount: 0,
        type: AllocationEnum.DOLLARS,
      });
    this.userId = obj.userId;
    this.maximumAllocation =
      obj.maximumAllocation || AllocationLimit.MIN_DEFAULT;
    this.minimumAllocation =
      obj.minimumAllocation || AllocationLimit.MAX_DEFAULT;
    this.buyingConditions = ConditionFactory.createFromArray(
      obj.buyingConditions || []
    );
    this.sellingConditions = ConditionFactory.createFromArray(
      obj.sellingConditions || []
    );
    this.createdAt = obj.createdAt || new Date();
  }

  async clone(iproto: IPrototypeStrategy) {
    const obj = _.cloneDeep(this);
    delete (obj as any)._id;
    const strategy = new Strategy({
      ...obj,
      targetAsset: AssetFactory.create(iproto.targetAsset),
      name: iproto.name,
    });
    await strategy.save();
    return strategy;
  }

  private buyPreconditionsCheck(obj: IPrecondition): boolean {
    const { priceMap, portfolio } = obj;
    let maxAllocated = AllocationLimit.buyLimitReached(
      portfolio.maximumAllocation,
      portfolio.buyingPower,
      portfolio.positions,
      priceMap
    );
    if (maxAllocated) {
      return true;
    }
    return false;
  }

  private sellPreconditionsCheck(obj: IPrecondition): boolean {
    const { priceMap, portfolio } = obj;
    let minAllocated = AllocationLimit.sellLimitReached(
      portfolio.minimumAllocation,
      portfolio.buyingPower,
      portfolio.positions,
      priceMap
    );
    if (minAllocated) {
      return true;
    }
    return false;
  }

  public preconditionsFailed(
    obj: IPrecondition,
    checkIfpriceIsUnrealistic = true
  ): boolean {
    const { buyOrSellEnum, unacknowledgedOrders, priceMap, portfolio } = obj;
    if (
      unacknowledgedOrders.some((order) => {
        let strategyEqual = _.isEqual(order.strategyId, this._id);
        let portfolioEqual = _.isEqual(order.portfolioId, portfolio._id);
        let sideEqual = order.side === buyOrSellEnum;
        return strategyEqual && portfolioEqual && sideEqual;
      })
    ) {
      return true;
    }
    const priceIsUnrealistic = priceMap.priceIsUnrealistic(this.targetAsset);
    if (checkIfpriceIsUnrealistic && priceIsUnrealistic.result) {
      print("Price is unrealistic, not allowed to buy");
      print("Last iteration map", priceIsUnrealistic.lastPrice);
      print("Current iteration map", priceIsUnrealistic.currentPrice);
      return true;
    }

    return buyOrSellEnum === BuyOrSellEnum.BUY
      ? this.buyPreconditionsCheck(obj)
      : this.sellPreconditionsCheck(obj);
  }

  public addBuyingCondition(condition: AbstractCondition) {
    this.buyingConditions.push(condition);
  }

  public addSellingCondition(condition: AbstractCondition) {
    this.sellingConditions.push(condition);
  }

  public static async findByName(name: string, userId: Id): Promise<Strategy> {
    let strategyModel = await StrategyModel.findOne({ name, userId });
    if (strategyModel) {
      return Strategy.createStrategyFromModel(strategyModel);
    } else {
      throw new Error("Strategy Name Not Found");
    }
  }

  public static async findByNames(
    names: string[],
    userId: Id
  ): Promise<Strategy[]> {
    let strategyModels = await StrategyModel.find({
      name: { $in: names },
      userId,
    });
    if (strategyModels) {
      return strategyModels.map((strategyModel) => {
        return Strategy.createStrategyFromModel(strategyModel);
      });
    } else {
      throw new Error("Strategy Names Not Found");
    }
  }

  static async findOrCreate(
    strategyObj: IStrategy,
    userId: Id
  ): Promise<Strategy> {
    const data = strategyObj as any;
    strategyObj.name = strategyObj.name.trim();
    let strategy: Strategy;
    if (data._id) {
      return Strategy.findById(data._id, userId);
    }
    delete data._id;
    strategy = new Strategy({ ...data, userId });
    await strategy.save();
    return strategy;
  }

  public static async findByIds(ids: string[], userId: Types.ObjectId) {
    return StrategyModel.find({ userId, _id: { $in: ids } }).then((models) => {
      if (!models) {
        throw new Error("No Strategies Found");
      }
      return models.map((m) => {
        return Strategy.createStrategyFromModel(m);
      });
    });
  }

  public static async findById(id: Id, userId: Id): Promise<Strategy> {
    let strategyModel = await StrategyModel.findOne({
      _id: id,
      userId: userId as any,
    });
    if (strategyModel) {
      return Strategy.createStrategyFromModel(strategyModel);
    } else {
      throw new Error("Strategy ID Not Found");
    }
  }

  public static async findByIdAndUpdate(
    id: Id,
    userId: Id,
    data: IStrategy
  ): Promise<Strategy> {
    let strategyModel = await StrategyModel.findOneAndUpdate(
      {
        _id: id,
        userId: userId as any,
      },
      data
    );
    if (strategyModel) {
      return Strategy.createStrategyFromModel(strategyModel);
    } else {
      throw new Error("Strategy ID Not Found");
    }
  }

  public static createStrategyFromModel(model: IStrategyModel): Strategy {
    const strategy = new Strategy(model);
    strategy._id = model._id;
    return strategy;
  }

  public static async find(obj = {}): Promise<Strategy[]> {
    return StrategyModel.find(obj).then((result) => {
      return result.map((internalModel) => {
        return Strategy.createStrategyFromModel(internalModel);
      });
    });
  }

  public static async deleteStrategyByName(name: string, userId: Id) {
    return StrategyModel.deleteMany({ name, userId });
  }

  static deleteById(strategyId: Id, userId: Id) {
    return StrategyModel.deleteOne({ _id: strategyId, userId: userId });
  }

  public static async searchQueryInModel(
    query: string,
    limit: number,
    userId: Id
  ) {
    const search = new SearchHelper(StrategyModel);
    const queriedFields = ["name", "targetAsset.name", "targetAsset.symbol"];
    return search.searchQueryInModel(
      query,
      limit,
      { userId },
      null,
      queriedFields
    );
  }
}

export default Strategy;
