import date from "date-and-time";
import { model, Schema, Types } from "mongoose";
import { DeploymentEnum } from "../../utils/enums";
import AbstractModel, { Id } from "../abstractions/abstractModel";
import SearchHelper from "../abstractions/searchHelper";
import { AllocationLimit } from "../allocation";
import { OrderHistory, PortfolioHistory } from "../history";
import Order from "../order";
import PriceMap from "../priceMap";
import Strategy from "../strategy";
import AbstractPortfolio from "./abstractPortfolio";
import {
  IPortfolio,
  LIVE_CONFIG_DEFAULT,
  PAPER_CONFIG_DEFAULT,
} from "./interfaces";

const portfolioSchema = new Schema<IPortfolio>({
  name: { type: String, required: true },
  userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
  strategies: [{ type: Types.ObjectId, ref: "Strategy", default: [] }],
  createdAt: { type: Date, default: Date.now },
  commissionPaid: { type: Number, default: 0 },
  deployment: { type: DeploymentEnum, default: DeploymentEnum.PAPER },
  lastPurchaseDate: { type: Date, required: false },
  lastSaleDate: { type: Date, required: false },
  initialValue: { type: Number, required: true },
  positions: { type: [Object], required: true, default: [] },
  buyingPower: { type: Number, required: true },
  version: { type: Number, required: true, default: 1 },
  main: { type: Boolean, default: false },
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
  paperConfig: {
    type: Object,
    required: false,
    default: PAPER_CONFIG_DEFAULT,
  },
  liveTradeConfig: {
    type: Object,
    required: false,
    default: LIVE_CONFIG_DEFAULT,
  },
  active: { type: Boolean, default: false },
});

const PortfolioModel = model<AbstractPortfolio>("Portfolio", portfolioSchema);

export class Portfolio extends AbstractPortfolio implements AbstractModel {
  /**
   * A class representing the main portfolio object
   *
   * @remarks
   * A portfolio models a real portfolio. Each portfolio can have
   * multiple strategies, which allows the user to trade algorithmically.
   * A user can define multiple portfolios, each with their own strategies.
   */
  public version: number;

  constructor(init: IPortfolio) {
    super(init);
  }

  public get id() {
    return this._id;
  }

  public async save() {
    const strategies = this.strategies;
    this.strategies = this.strategies.map((s) => s._id) as any;
    this.version += 1;
    if (this._id) {
      await PortfolioModel.updateOne({ _id: this._id }, this);
      this.strategies = strategies;
      return;
    }
    const model = await PortfolioModel.create(this);
    this.strategies = strategies;
    this._id = model.id;
  }

  public setStrategies(strategies: Strategy[]) {
    this.strategies = strategies;
  }

  public getStrategies(): Strategy[] {
    return this.strategies;
  }

  public addStrategy(strategy: Strategy) {
    this.strategies = [strategy, ...this.strategies];
  }

  public get config() {
    return this.deployment === DeploymentEnum.PAPER
      ? this.paperConfig
      : this.liveTradeConfig;
  }

  public get value() {
    const positionValue = this.positions
      .map((p) => p.lastPrice * p.quantity)
      .reduce((acc, cur) => acc + cur, 0);

    const total = positionValue + this.buyingPower;
    return Math.round(100 * total) / 100;
  }

  public static getPl(history: { value: number }[]) {
    const start = history[0];
    const end = history[history.length - 1];
    const dollars = end["value"] - start["value"];
    const percent = Math.round((dollars / start["value"]) * 10000) / 100;
    return { percent: percent, dollars: dollars };
  }

  public async updatePositions(order: Order) {
    const { commission } = super._updatePositions(order);
    await this.addOrderToHistory(order, commission);
    await this.save();
  }

  public async updateValue(priceMap: PriceMap) {
    // iterate over positions and make value their last value
    super.updateValue(priceMap);
    await this.save();
  }

  public deleteExpiredOptions() {
    super.deleteExpiredOptions();
  }

  public async addOrderToHistory(order: Order, commission: number) {
    await OrderHistory.addToOrderHistory(this._id, order._id, commission);
  }

  public async initializeHistory() {
    const ts = date.addDays(new Date(), -1);
    await PortfolioHistory.updatePortfolioHistory(this._id, ts, {
      value: this.initialValue,
      positions: this.positions,
    });
    const ts2 = date.addHours(new Date(), -2);
    await PortfolioHistory.updatePortfolioHistory(this._id, ts2, {
      value: this.initialValue,
      positions: this.positions,
    });
  }

  public async updateHistory(priceMap: PriceMap) {
    const ts = new Date();
    await PortfolioHistory.updatePortfolioHistory(this._id, ts, {
      value: this.calculateValue(priceMap),
      positions: this.positions,
    });
  }

  public static async findByNames(names: string[], userId: Id) {
    return PortfolioModel.find({ userId, name: { $in: names } })
      .populate("strategies")
      .then((models) => {
        if (!models) {
          return [];
        }
        return models.map((m) => new Portfolio(m));
      });
  }

  public static async findPortfolioByName(
    name: string,
    userId: Id
  ): Promise<Portfolio> {
    return PortfolioModel.findOne({ userId, name })
      .populate("strategies")
      .then((model) => {
        if (!model) {
          return null;
        }
        return new Portfolio(model);
      });
  }

  public static async findByUserId(userId: Id): Promise<Portfolio[]> {
    return PortfolioModel.find({
      userId: userId,
    })
      .populate("strategies")
      .then((models) => {
        if (!models) {
          return [];
        }
        return models.map((model) => {
          return new Portfolio(model);
        });
      });
  }

  public async getOrders(userId: Id): Promise<Order[]> {
    const orders = await Order.find({ userId, portfolioId: this._id });
    return orders;
  }

  public static async findById(id: Id, userId: Id): Promise<Portfolio> {
    if (id === "main") {
      return Portfolio.findMainPortfolio(userId);
    }
    return PortfolioModel.findById({
      _id: id,
      userId: userId,
    })
      .populate("strategies")
      .then((model) => {
        if (!model) {
          return null;
        }
        return new Portfolio(model);
      });
  }

  public static async findByStrategy(
    strategy: Strategy,
    userId: Id
  ): Promise<Portfolio> {
    const id = strategy._id as any;
    const portfolioM = await PortfolioModel.findOne({
      strategies: { $in: id },
      userId: userId,
    }).populate("strategies");
    if (!portfolioM) {
      return null;
    }
    const portfolio = new Portfolio(portfolioM);
    return portfolio;
  }

  public static async find(obj = {}): Promise<Portfolio[]> {
    const arr = await PortfolioModel.find(obj)
      .sort({ main: -1 })
      .populate("strategies");
    const portfolios = arr.map((p) => new Portfolio(p));
    return portfolios;
  }

  public static async findUpdated(
    obj: {
      userId: Id;
      active: boolean;
      deployment: DeploymentEnum;
    },
    currentPortfolios: Portfolio[]
  ): Promise<Portfolio[]> {
    const updatedVersions = await PortfolioModel.find(obj, { version: 1 });
    const portfolios: Portfolio[] = [];
    const tmp: Promise<Portfolio>[] = [];
    for (const updatedPortfolioId of updatedVersions) {
      const found = currentPortfolios.find(
        (p) => p._id === updatedPortfolioId._id
      );
      if (found && found.version === updatedPortfolioId.version) {
        portfolios.push(found);
      } else {
        const portfolio = Portfolio.findById(
          updatedPortfolioId._id,
          obj.userId
        ).then((p) => {
          if (!p) {
            throw new Error("Portfolio not found");
          }
          return p;
        });
        tmp.push(portfolio);
      }
    }
    const newPortfolios = await Promise.all(tmp);
    portfolios.push(...newPortfolios);
    return portfolios;
  }

  public static async findMainPortfolio(userId: Id) {
    const model = await PortfolioModel.findOne({
      userId,
      main: true,
    }).populate("strategies");
    if (!model) {
      throw new Error("No main portfolio found");
    }
    return new Portfolio(model);
  }

  public static async createInitialPortfolio(userId: Id): Promise<Portfolio> {
    const portfolio = new Portfolio({
      userId,
      name: "My First Portfolio",
      initialValue: 10000,
      main: true,
    });
    await portfolio.save();
    return portfolio;
  }

  public async setMainPortfolio(userId: Id) {
    const mainPortfolio = await PortfolioModel.findOne({
      userId,
      main: true,
    });
    if (mainPortfolio) {
      mainPortfolio.main = false;
      await mainPortfolio.save();
    }
    this.main = true;
    await this.save();
  }

  public static async searchQueryInModel(
    query: string,
    limit: number,
    userId: Id
  ) {
    const search = new SearchHelper(PortfolioModel);
    return search.searchQueryInModel(query, limit, { userId });
  }
}
