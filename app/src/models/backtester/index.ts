import date from "date-and-time";
import _, { cloneDeep, isNil } from "lodash";
import { model, Schema, Types } from "mongoose";
import { Worker } from "worker_threads";
import {
  debug,
  formatDate,
  MarketDataPoint,
  ValidationError,
} from "../../utils";
import {
  AssetTypeEnum,
  BuyOrSellEnum,
  StatusEnum,
  TimeIntervalEnum,
} from "../../utils/enums";
import AbstractModel, { Id } from "../abstractions/abstractModel";
import { Allocation } from "../allocation";
import AssetFactory, { AbstractAsset, Stock } from "../asset";
import { IBrokerage } from "../brokerage/AbstractBrokerage";
import BacktestBrokerage from "../brokerage/BacktestBrokerage";
import ConditionFactory from "../conditions";
import Order from "../order";
import { MockPortfolio } from "../portfolio";
import PriceMap from "../priceMap";
import Statistics, { IStatistics } from "../statistics";
import Strategy from "../strategy";
import Time from "../time";

interface IBacktesterConfig {
  name: string;
  startDate: Date;
  endDate: Date;
  portfolio: MockPortfolio;
  brokerage: BacktestBrokerage;
  userId: Id;
  interval: TimeIntervalEnum;
  saveOnInitialization?: boolean;
  validateOnInitialization?: boolean;
}

interface IBacktester extends IBacktesterConfig {
  _currentDate?: Date;
  _currentTime?: Time;
  status?: StatusEnum;
  statistics?: IStatistics;
  history?: Map<String, MarketDataPoint>;
  timeElapsed?: number;
  error?: string;
  successfulBuyHistory?: Array<IAction>;
  successfulSellHistory?: Array<IAction>;
  createdAt?: Date;
  updatedAt?: Date;
  _id?: Id;
}

interface ActionData {
  asset: string;
  strategy: string;
  buyingPower: number;
  condition: string;
  quantity: number;
  price: number;
  order?: Order;
}

interface IAction {
  date: Date;
  data: ActionData;
}

interface IRunBacktestConfig {
  saveOnRun: boolean;
  generateBaseline: boolean;
}

const backtestSchema = new Schema<Backtester>({
  userId: {
    type: Types.ObjectId,
    ref: "User",
    index: true,
  },
  portfolioId: {
    type: String,
    index: true,
  },
  startDate: { type: Object, required: true },
  endDate: { type: Object, required: true },
  _currentDate: { type: Object, required: true },
  _currentTime: { type: Object, required: true },
  interval: { type: String, required: true },
  portfolio: { type: Object, required: true },
  statistics: Object,
  createdAt: { type: Object, default: Date.now },
  updatedAt: { type: Object, default: Date.now },
  status: { type: String, default: StatusEnum.PENDING },
  assets: { type: [Object] },
  timeElapsed: { type: Number, default: 0 },
  name: { type: String },
  error: { type: String },
  successfulBuyHistory: { type: [Object], default: [] },
  successfulSellHistory: { type: [Object], default: [] },
});

const BacktestModel = model<Backtester>("Backtest", backtestSchema);

class Backtester extends AbstractModel implements IBacktester {
  /**
   * Model that contains the backtesting logic and data
   *
   * @remarks
   * This model can be thought of as a controller. It combines many different
   * components and runs a backtest very similar to the forwardtestController
   *
   * @privateRemarks
   * This is currently implemented using Tradier's OHLC data, but should be refactored
   * to use Alpaca's data. Note that Alpaca doesn't currently support options, but that
   * will should be changed by the middle of next year.
   */
  _id: Id;
  _currentDate: Date;
  _currentTime: Time;
  brokerage: BacktestBrokerage;
  baselineAsset: AbstractAsset;
  portfolioId: Id;
  portfolio: MockPortfolio;
  startDate: Date;
  status: StatusEnum;
  history: Map<string, MarketDataPoint>;
  timeElapsed: number;
  error: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  endDate: Date;
  userId: Id;
  interval: TimeIntervalEnum;
  successfulBuyHistory: IAction[];
  successfulSellHistory: IAction[];
  statistics: IStatistics;

  private constructor(obj: IBacktester) {
    super();
    const startDate = new Date(formatDate(obj.startDate) + " 00:00:00");
    const endDate = new Date(formatDate(obj.endDate) + " 00:00:00");
    const newDate = new Date();
    this._id = obj._id;
    this.portfolio = obj.portfolio;
    this.portfolioId = obj.portfolio._id;
    this.brokerage = obj.brokerage;
    this.baselineAsset = new Stock("SPY");
    this.startDate = startDate;
    this.endDate = endDate;
    this._currentDate = obj._currentDate || cloneDeep(startDate);
    this._currentTime = obj._currentTime || new Time(obj.interval);
    this.status = obj.status || StatusEnum.PENDING;
    this.timeElapsed = obj.timeElapsed || 0;
    this.error = obj.error || "";
    this.createdAt = obj.createdAt || newDate;
    this.updatedAt = cloneDeep(newDate);
    this.name = obj.name;
    this.userId = obj.userId;
    this.interval = obj.interval;
    this.successfulBuyHistory = obj.successfulBuyHistory || [];
    this.successfulSellHistory = obj.successfulSellHistory || [];
    this.statistics = obj.statistics || new Statistics();
  }

  public get currentDate(): Date {
    return this._currentTime.getDateTime(this._currentDate);
  }

  public static async findSummaries(
    portfolioId: Id,
    userId: Id,
    limit: number
  ): Promise<IBacktester[]> {
    return BacktestModel.find({ userId, portfolioId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .then((models) => {
        return models.map((model) => model.toObject());
      });
  }

  public static async create(init: IBacktesterConfig) {
    // remove any time information from the date
    const startDate = new Date(formatDate(init.startDate) + " 00:00:00");
    const endDate = new Date(formatDate(init.endDate) + " 00:00:00");
    let mockPortfolio = MockPortfolio.newBacktest(init.portfolio);
    const backtester = new Backtester(init);
    const { validateOnInitialization, saveOnInitialization } = init;
    if (isNil(validateOnInitialization) ? true : validateOnInitialization) {
      await backtester.validate(
        startDate,
        endDate,
        mockPortfolio,
        backtester.brokerage
      );
    }

    if (isNil(saveOnInitialization) ? true : saveOnInitialization) {
      await backtester.save();
    }
    return backtester;
  }

  public async generateBaselineComparison() {
    await this.validateHistory(
      this.baselineAsset,
      this.startDate,
      this.brokerage
    );
    this.portfolio.generateBaselineComparison({
      brokerage: this.brokerage,
      frequency: this._currentTime.frequency,
      comparisonAsset: this.baselineAsset,
    });
  }

  public async run(config: IRunBacktestConfig): Promise<void> {
    const { saveOnRun, generateBaseline } = config;
    try {
      this.status = StatusEnum.RUNNING;
      let priceMap: PriceMap;
      while (this.currentDate < this.endDate) {
        if (this.marketIsOpen()) {
          priceMap = this.getPrices();
          let portfolio = this.portfolio;
          let strategies = portfolio.strategies;
          for (let j = 0; j < strategies.length; j++) {
            let strategy = strategies[j];
            await this.initiateBuyFlow(portfolio, strategy, priceMap);
            await this.initiateSellFlow(portfolio, strategy, priceMap);
          }
          this.updatePortfolioValues(priceMap);
        }
        this.incrementTime();
        this.expireOptions(this.portfolio);
      }
      this.calculateFinalStatistics(priceMap);
      if (generateBaseline) {
        await this.generateBaselineComparison();
      }
      this.status = StatusEnum.COMPLETE;
      if (saveOnRun) {
        await this.save();
      }
    } catch (e) {
      debug("An error occurred while running the backtest");
      debug(e);
      this.status = StatusEnum.ERROR;
      this.error = e.message;
      await this.save();
    }
  }

  public async save(): Promise<void> {
    this.updatedAt = new Date();
    if (this._id) {
      await BacktestModel.updateOne({ _id: this._id }, this);
      return;
    }
    const model = await BacktestModel.create(this);
    this._id = model._id;
  }

  public calculateFinalStatistics(priceMap: PriceMap) {
    const finalValue = this.portfolio.calculateValue(priceMap);
    const initialValue = this.portfolio.initialValue;
    const statistics = new Statistics();
    statistics.calculateStatistics(
      finalValue,
      initialValue,
      this.portfolio.valueHistory,
      this.portfolio.deltaValueHistory
    );
    this.statistics = statistics;
  }

  public expireOptions(portfolio: MockPortfolio) {
    portfolio.deleteExpiredOptions(this.currentDate);
  }

  public getPrices(): PriceMap {
    let d = this.currentDate;
    const pricePoint = this.brokerage.getBacktestPrices(
      d,
      this._currentTime.frequency
    );
    if (!pricePoint) {
      throw new ValidationError(`No price data`);
    }
    return pricePoint;
  }

  public updatePortfolioValues(priceMap: PriceMap) {
    let portfolio = this.portfolio;
    portfolio.updateHistory(priceMap, _.cloneDeep(this.currentDate));
    let positions = portfolio.positions;
    for (let j = 0; j < positions.length; j++) {
      let position = positions[j];
      let price = priceMap.getPositionPrice(position);
      if (price) {
        position.lastPrice = price;
      }
    }
  }

  static async findOne(backtestId: Id, userId: Id): Promise<Backtester> {
    return BacktestModel.findOne({ _id: backtestId, userId }).then((model) => {
      if (!model) {
        throw new ValidationError("Backtest not found");
      }
      return new Backtester(model);
    });
  }

  static async findOneAndRun(
    backtestId: Id,
    userId: Id,
    backtestBrokerage: BacktestBrokerage,
    config?: IRunBacktestConfig
  ) {
    const model = await BacktestModel.findOne({
      _id: backtestId,
      userId: userId,
    });
    if (!model) {
      throw new ValidationError("Backtest not found");
    }
    const { startDate, endDate, interval } = model;
    const portfolio = MockPortfolio.newBacktest(model.portfolio);
    const backtester = new Backtester({
      name: model.name,
      startDate: startDate,
      endDate: endDate,
      interval: interval,
      userId: userId,
      brokerage: backtestBrokerage,
      portfolio,
      _currentDate: startDate,
      _currentTime: new Time(interval),
    });
    await backtester.validate(startDate, endDate, portfolio, backtestBrokerage);
    model.timeElapsed = 0;
    model._currentTime = new Time(model._currentTime.frequency);
    model._currentDate = new Date(startDate);
    model.successfulBuyHistory = [];
    model.successfulSellHistory = [];
    model.error = "";
    model.status = StatusEnum.RUNNING;
    model.statistics = new Statistics();
    const newConfig = config
      ? config
      : { saveOnRun: true, generateBaseline: true };
    await backtester.run(newConfig);
    return backtester;
  }

  public async initiateBuyFlow(
    portfolio: MockPortfolio,
    strategy: Strategy,
    priceMap: PriceMap
  ) {
    let asset = strategy.targetAsset;

    // if one strategy in buyingConditions is true:
    let conditions = ConditionFactory.createFromArray(
      strategy.buyingConditions
    );
    let price = priceMap.getDynamicPrice(
      asset,
      BuyOrSellEnum.BUY,
      portfolio.config.fillAt
    );
    let quantity = Allocation.calculateQuantityToBuy(
      asset,
      priceMap,
      strategy.buyAmount,
      portfolio.buyingPower,
      portfolio.positions,
      portfolio.config
    );
    let enoughBuyingPower =
      portfolio.buyingPower > 0.01 * portfolio.initialValue;
    for (let i = 0; i < conditions.length; i++) {
      if (!enoughBuyingPower || quantity <= 0) {
        break;
      }
      let conditionIsTrue = await conditions[i].isTrue({
        strategy: strategy,
        brokerage: this.brokerage,
        priceMap: priceMap,
        portfolio: portfolio,
        currentTime: this.currentDate,
      });
      const actionData: ActionData = {
        asset: asset.symbol,
        strategy: strategy.name,
        buyingPower: portfolio.buyingPower,
        condition: conditions[i].toString(),
        quantity: quantity,
        price,
      };
      if (conditionIsTrue) {
        const order = Order.createMockOrder({
          asset,
          quantity,
          currentDate: this.currentDate,
          priceOfAsset: price,
          side: BuyOrSellEnum.BUY,
          strategyId: strategy.id,
          portfolioId: portfolio._id,
          userId: this.userId,
        });
        portfolio.buy(order);
        actionData.order = order;
        this.recordAction(this.successfulBuyHistory, actionData);
        return;
      }
    }
  }

  public recordAction(actionArray: IAction[], data: ActionData) {
    actionArray.push({
      date: this.currentDate,
      data: data,
    });
  }

  public getOrders(): Order[] {
    const actions = this.successfulBuyHistory.concat(
      this.successfulSellHistory
    );
    const orders: Order[] = actions.map((action) => {
      return action.data.order;
    });
    orders.sort((a, b) => a.filledAtTime.getTime() - b.filledAtTime.getTime());
    return orders;
  }

  public async initiateSellFlow(
    portfolio: MockPortfolio,
    strategy: Strategy,
    priceMap: PriceMap
  ) {
    let conditions = ConditionFactory.createFromArray(
      strategy.sellingConditions
    );
    let positions = portfolio.positions;
    for (let i = 0; i < conditions.length; i++) {
      for (let j = 0; j < positions.length; j++) {
        let pos = positions[j];
        if (pos.symbol !== strategy.targetAsset.symbol) {
          continue;
        }
        let condition = conditions[i];
        let config = portfolio.config;
        let price = priceMap.getPositionPrice(pos, config.fillAt);
        let conditionIsTrue = await condition.isTrue({
          strategy: strategy,
          brokerage: this.brokerage,
          priceMap: priceMap,
          portfolio: portfolio,
          position: pos,
          currentTime: this.currentDate,
        });
        if (conditionIsTrue) {
          let positionAsset = AssetFactory.createFromPosition(pos);
          let quantity = Allocation.calculateQuantityToSell(
            positionAsset,
            priceMap,
            strategy.sellAmount,
            portfolio.buyingPower,
            portfolio.positions,
            portfolio.config
          );
          const order = Order.createMockOrder({
            asset: positionAsset,
            quantity,
            currentDate: this.currentDate,
            priceOfAsset: price,
            side: BuyOrSellEnum.SELL,
            strategyId: strategy.id,
            portfolioId: portfolio._id,
            userId: this.userId,
          });
          portfolio.sell(order);
          const actionData = {
            asset: pos.symbol,
            strategy: strategy.name,
            buyingPower: portfolio.buyingPower,
            condition: conditions[i].toString(),
            quantity: quantity,
            price,
            order,
          };
          this.recordAction(this.successfulSellHistory, actionData);
        }
      }
    }
  }

  public checkBacktestPreconditions(startDate: Date, endDate: Date) {
    if (endDate < startDate) {
      throw new ValidationError("End date must be after start date");
    }
  }

  public async validate(
    startDate: Date,
    endDate: Date,
    portfolio: MockPortfolio,
    brokerage: BacktestBrokerage
  ) {
    this.checkBacktestPreconditions(startDate, endDate);
    for (let i = 0; i < portfolio.strategies.length; i++) {
      let strategy = portfolio.strategies[i];
      let asset = strategy.targetAsset;
      await this.validateHistory(asset, startDate, brokerage);
      let conditions = [
        ...strategy.buyingConditions,
        ...strategy.sellingConditions,
      ];
      for (let j = 0; j < conditions.length; j++) {
        let condition = ConditionFactory.create(conditions[j]);
        let conditionAssets = condition.assetFields;
        if (!condition.hasAssetField()) {
          continue;
        }
        for (let k = 0; k < conditionAssets.length; k++) {
          let conditionAsset = conditionAssets[k];
          if (conditionAsset.value instanceof AbstractAsset) {
            conditionAsset.value = [conditionAsset.value];
          }
          for (let k = 0; k < conditionAsset.value.length; k++) {
            let asset = conditionAsset.value[k];
            await this.validateHistory(asset, startDate, brokerage);
          }
        }
      }
    }
  }

  public async validateHistory(
    asset: AbstractAsset,
    startDate: Date,
    brokerage: BacktestBrokerage
  ) {
    if (asset.type === AssetTypeEnum.NONE) {
      return;
    }
    if (asset.type !== AssetTypeEnum.STOCK) {
      // TODO: After getting EOD options data, remove this check
      throw new ValidationError("Only stocks are supported");
    }
    const pastTime = this.portfolio.getEarliestDatePossible();
    const startDateStr = formatDate(date.addDays(startDate, pastTime - 1));
    const historyPoint = await brokerage.getMarketHistory(
      asset,
      startDateStr,
      new Date()
    );
    if (
      !historyPoint ||
      !historyPoint[0] ||
      new Date(historyPoint[0].date) > startDate
    ) {
      throw new ValidationError(`No data for ${asset.symbol} on ${startDate}.`);
    }
  }

  getActions() {
    const actions = [
      ...this.successfulBuyHistory,
      ...this.successfulSellHistory,
    ].sort((a, b) => a.date.getTime() - b.date.getTime());
    return actions;
  }

  public marketIsOpen() {
    const d = this.currentDate;
    try {
      this.brokerage.getBacktestPrices(d, this._currentTime.frequency);
      return true;
    } catch {
      return false;
    }
  }

  createWorker(brokerage: IBrokerage) {
    const workerData = {
      userId: this.userId.toString(),
      brokerage: brokerage,
      backtestId: this._id.toString(),
    };
    let worker = new Worker("./dist/controller/backtestController/worker.js", {
      workerData,
    });
    worker.on("error", (message) => {
      debug("An error occurred in worker: ", message);
    });
    return worker;
  }

  public incrementTime() {
    // TODO: if data is finer grain than OHLC data, move forward in time by granularity
    // For now, move forward in time by Open -> Close, Close -> Open
    if (this._currentTime.isEOD()) {
      this._currentDate.setDate(this._currentDate.getDate() + 1);
    }
    this._currentTime.next();
    this.timeElapsed++;
  }
}

export default Backtester;
