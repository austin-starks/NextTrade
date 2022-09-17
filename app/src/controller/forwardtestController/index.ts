import ReconnectingWebSocket from "reconnecting-websocket";
import { Worker } from "worker_threads";
import { Id } from "../../models/abstractions/abstractModel";
import { Allocation } from "../../models/allocation";
import AssetFactory, { DebitSpread, Option } from "../../models/asset";
import BrokerageFactory, {
  AbstractBrokerage,
  IBrokerage,
} from "../../models/brokerage";
import Calendar from "../../models/calendar";
import ConditionFactory from "../../models/conditions";
import Order from "../../models/order";
import Portfolio from "../../models/portfolio";
import Position from "../../models/position";
import PriceMap from "../../models/priceMap";
import Strategy from "../../models/strategy";
import User from "../../models/user";
import { debug, print, sleep } from "../../utils";
import {
  AssetTypeEnum,
  BuyOrSellEnum,
  DeploymentEnum,
} from "../../utils/enums";

const MS_BETWEEN_RUNS = 2000;

export default class ForwardTest {
  /**
   * Controller that runs the main forward-test function
   *
   * @remarks
   * This function is called for every user in the database in app.ts.
   * It takes a user in the constructor and executes the main forward-testing
   * logic. This is:
   *  - Loads the user's portfolios
   *  - Gets the user's assets (all target assets and current positions)
   *  - Gets the prices of the assets
   * -  Updates the user's portfolio history
   *  - Initiaites the buy/sell logic for each portfolio
   *     - For each portfolio, loop through each strategy
   *     - For each strategy, loop through all of the conditions
   *     - If a condition is satisfied, create an order
   *  - Update all orders
   *  - Update the user's positions in each portfolio
   */
  public brokerage: AbstractBrokerage;
  public userId: Id;
  public numIterations: number;
  public codeinProduction: boolean;
  public printPortfolio: boolean;
  public msBetweenRuns: number;
  public priceMap: PriceMap;
  public websocket: ReconnectingWebSocket;
  public symbols: Set<string>;
  public portfolios: Array<Portfolio>;

  constructor(userId: Id, brokerage: IBrokerage) {
    this.brokerage = BrokerageFactory.create(brokerage);
    this.userId = userId;
    this.numIterations = 0;
    this.msBetweenRuns = MS_BETWEEN_RUNS;
    this.codeinProduction = process.env.NODE_ENV === "production";
    this.printPortfolio = false;
    this.priceMap = new PriceMap();
    this.websocket = null;
    this.symbols = new Set();
  }

  public async run(): Promise<void> {
    try {
      await this.initialize();
      this.print("Running Live-Trader!");
      this.print("\n****************************\n");
      if (this.codeinProduction) {
        await this.waitToStart();
      }
      while (!this.codeinProduction || Calendar.marketIsOpenNow()) {
        await this.runLoop();
        await sleep(this.msBetweenRuns);
      }
      this.brokerage.clearMarketHistory();

      // sendPLchangeAtEOD() : Email
      await this.run();
    } catch (e) {
      console.error(e);
    }
  }
  public async runLoop() {
    const d = new Date();
    print("Loop ", d.toDateString(), d.toTimeString());
    this.portfolios = await Portfolio.findUpdated(
      {
        userId: this.userId,
        active: true,
        deployment: DeploymentEnum.PAPER,
      },
      this.portfolios
    );
    const portfolios = this.portfolios;
    await this.updatePrices(portfolios);
    let unacknowledgedOrders = [];
    for (let i = 0; i < portfolios.length; i++) {
      let portfolio = portfolios[i];
      unacknowledgedOrders = await Order.getUnacknowledgedOrders(
        this.userId,
        portfolio._id
      );
      const strategies = portfolio.getStrategies();
      for (let j = 0; j < strategies.length; j++) {
        let strategy = strategies[j];
        this.print("Running strategy:", strategy.name);
        unacknowledgedOrders = await this.initiaiteBuyFlow(
          portfolio,
          strategy,
          unacknowledgedOrders
        );
        unacknowledgedOrders = await this.inititeSellFlow(
          portfolio,
          strategy,
          unacknowledgedOrders
        );
        await strategy.save();
      }
    }
    await this.updateUnfilledOrders();
    await this.updatePositionValue(portfolios);
    await this.updateFilledOrders();
    await this.updatePortfolioHistory(portfolios);
    this.printPortfolioValue(portfolios);
    this.print(`Loop iteration #${this.numIterations} complete\n`);
    this.numIterations += 1;
  }

  private print(str: any, ...args: any[]) {
    if (this.printPortfolio) {
      print(str, ...args);
    }
  }

  private async initiaiteBuyFlow(
    portfolio: Portfolio,
    strategy: Strategy,
    unacknowledgedOrders: Order[]
  ): Promise<Order[]> {
    if (
      strategy.preconditionsFailed({
        buyOrSellEnum: BuyOrSellEnum.BUY,
        priceMap: this.priceMap,
        unacknowledgedOrders: unacknowledgedOrders,
        portfolio,
      })
    ) {
      this.print(`Precondition Failed for buying with '${strategy.name}'`);
      return unacknowledgedOrders;
    }
    this.print(
      `Precondition Passed: Checking if a buying condition is satisfied. \n   -Strategy: '${strategy.name}'.`
    );

    let asset = strategy.targetAsset;

    // if one strategy in buyingConditions is true:
    let conditions = ConditionFactory.createFromArray(
      strategy.buyingConditions
    );
    let config = portfolio.config;
    let price = this.priceMap.getDynamicPrice(
      asset,
      BuyOrSellEnum.BUY,
      config.fillAt
    );
    let quantity = Allocation.calculateQuantityToBuy(
      asset,
      this.priceMap,
      strategy.buyAmount,
      portfolio.buyingPower,
      portfolio.positions,
      portfolio.config
    );
    let enoughBuyingPower =
      portfolio.buyingPower > 0.01 * portfolio.initialValue;
    for (let i = 0; i < conditions.length; i++) {
      if (!enoughBuyingPower || quantity <= 0) {
        this.print(`Not enough buying power for '${strategy.name}'`);
        this.print(`  - Buying power: $${portfolio.buyingPower}`);
        break;
      }
      let condition = conditions[i];
      let conditionIsTrue = await condition.isTrue({
        strategy: strategy,
        brokerage: this.brokerage,
        priceMap: this.priceMap,
        portfolio: portfolio,
        currentTime: new Date(),
      });
      if (conditionIsTrue) {
        if (this.printPortfolio) {
          let priceText =
            asset.type === AssetTypeEnum.OPTION ||
            asset.type === AssetTypeEnum.DEBIT_SPREAD
              ? `${price / 100} per contract.`
              : `${price} per share`;
          print(
            `Buying ${quantity} ${asset.symbol} near $${priceText} using '${strategy.name}'`
          );
          print(condition.toString());
        }

        let otherData =
          asset.type === AssetTypeEnum.DEBIT_SPREAD
            ? this.priceMap.getSpreadPrices(
                {
                  long: (asset as DebitSpread).long,
                  short: (asset as DebitSpread).short,
                },
                BuyOrSellEnum.BUY,
                config.fillAt
              )
            : null;

        let order = await this.brokerage.sendOrder({
          asset: asset,
          side: BuyOrSellEnum.BUY,
          price: price,
          strategy: strategy,
          portfolio: portfolio,
          userId: this.userId,
          quantity: quantity,
          type: portfolio.config.orderType,
          deployment: portfolio.deployment,
          otherData: otherData,
        });
        return [...unacknowledgedOrders, order];
      }
    }
    return unacknowledgedOrders;
  }

  private async inititeSellFlow(
    portfolio: Portfolio,
    strategy: Strategy,
    unacknowledgedOrders: Order[]
  ): Promise<Order[]> {
    if (
      strategy.preconditionsFailed({
        buyOrSellEnum: BuyOrSellEnum.SELL,
        priceMap: this.priceMap,
        unacknowledgedOrders: unacknowledgedOrders,
        portfolio,
      })
    ) {
      this.print(`Precondition Failed for selling with '${strategy.name}'`);
      return unacknowledgedOrders;
    }
    this.print(
      `Precondition Passed: Checking if a selling condition is satisfied. \n   -Strategy: '${strategy.name}'.`
    );
    // if one strategy in sellingConditions is true:
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
        let price = this.priceMap.getPositionPrice(pos, config.fillAt);
        let conditionIsTrue = await condition.isTrue({
          strategy: strategy,
          brokerage: this.brokerage,
          priceMap: this.priceMap,
          portfolio: portfolio,
          position: pos,
          currentTime: new Date(),
        });
        if (conditionIsTrue) {
          let positionAsset = AssetFactory.createFromPosition(pos);
          let quantity = Allocation.calculateQuantityToSell(
            positionAsset,
            this.priceMap,
            strategy.sellAmount,
            portfolio.buyingPower,
            portfolio.positions,
            portfolio.config
          );
          let priceText =
            pos.type === AssetTypeEnum.OPTION
              ? `${price / 100} per contract`
              : `${price} per share`;
          print(`Selling ${quantity} ${pos.symbol} near $${priceText}'`);
          print(`Strategy: '${strategy.name}`);
          print(condition.toString());
          let order = await this.brokerage.sendOrder({
            asset: positionAsset,
            side: BuyOrSellEnum.SELL,
            price: price,
            strategy: strategy,
            portfolio: portfolio,
            userId: this.userId,
            type: portfolio.config.orderType,
            quantity: quantity,
            deployment: portfolio.deployment,
          });
          return [order];
        }
      }
    }
    return unacknowledgedOrders;
  }

  private async updatePositionValue(portfolios: Array<Portfolio>) {
    for (let i = 0; i < portfolios.length; i++) {
      await portfolios[i].updateValue(this.priceMap);
    }
  }

  private async updatePortfolioHistory(portfolios: Array<Portfolio>) {
    for (let i = 0; i < portfolios.length; i++) {
      await portfolios[i].updateHistory(this.priceMap);
    }
  }

  public async waitToStart() {
    // check calendar to see if today is a trading day
    // if it is not, wait 24 hrs, then call function again
    // if it is, wait until 9:28am
    const isOpenToday = await Calendar.marketIsOpenToday();
    if (isOpenToday && Calendar.isBeforeMarketOpen()) {
      this.print(`It is currently before market open.`);
      const difInMS = Calendar.getMSUntilOpen();
      const hrs = Math.round((difInMS / 1000 / 60 / 60) * 100) / 100;
      const message = hrs > 1.5 ? `${hrs} hours` : `${hrs * 60} minutes.`;
      this.print(`Waiting ${message}`);
      await sleep(difInMS);
      this.print("The market will open soon.");
      return;
    } else if (isOpenToday && Calendar.marketIsOpenNow()) {
      this.print("The market is open.");
      return;
    } else {
      const d = new Date();
      this.print(`Market is closed at ${d.toLocaleString()}`);
      const difInMS = Calendar.getMSUntilTomorrow();
      this.print(
        `Waiting ${Math.round(difInMS / 1000 / 60 / 60)} hours until tomorrow.`
      );
      await sleep(difInMS);
      this.waitToStart();
    }
  }

  public async updateFilledOrders() {
    const filledOrders = await Order.getFilledOrders(this.userId);
    const len = filledOrders.length;
    if (len > 0 && this.printPortfolio) {
      this.print("Updating Portfolio with filled orders.");
      this.print("Number filled orders:", len);
    }
    for (let i = 0; i < filledOrders.length; i++) {
      let order = filledOrders[i];
      let portfolioId = order.portfolioId;
      let portfolio = await Portfolio.findById(portfolioId, this.userId);
      await portfolio.updatePositions(order);
      await order.acknowledge();
    }
  }

  public async getSymbols(portfolios: Portfolio[]): Promise<Set<string>> {
    const s = new Set<string>();
    const assets = await AssetFactory.getAssets(portfolios, this.brokerage);
    for (let i = 0; i < assets.length; i++) {
      s.add(assets[i].symbol);
    }
    return s;
  }

  private positionsAsString(positions: Position[]) {
    var s = "";
    for (let i = 0; i < positions.length; i++) {
      let p = positions[i];
      let currentPrice = this.priceMap.getPositionPrice(p);
      let totalValue = currentPrice * p.quantity;
      s = s.concat(
        `  - Position Name: ${p.symbol}, Cost: $${p.averageCost}, Current: $${currentPrice}\n    Total: $${totalValue}, Quantity: ${p.quantity}\n`
      );

      if (i < positions.length - 1) {
        s = s.concat("");
      }
    }
    return s;
  }

  private printPortfolioValue(portfolios: Portfolio[]) {
    if (this.printPortfolio) {
      for (let i = 0; i < portfolios.length; i++) {
        let p = portfolios[i];
        this.print(`Portfolio ${p.name}:`);
        this.print(`Portfolio Value: $${p.calculateValue(this.priceMap)}`);
        this.print(`  - Buying Power = $${p.buyingPower}`);
        let currPosStr = this.positionsAsString(p.positions);
        if (currPosStr) {
          this.print(`${currPosStr}`);
        }
      }
    }
  }

  public async initialize() {
    let portfolios = await Portfolio.find({
      userId: this.userId,
      active: true,
      deployment: DeploymentEnum.PAPER,
    });
    this.portfolios = portfolios;
    let assetList = await AssetFactory.getAssets(portfolios, this.brokerage);
    const tmpMap = await this.brokerage.getPrices(assetList);
    this.priceMap.setPriceFromMap(tmpMap);
    let strategies = await Strategy.find({ userId: this.userId });
    await Option.getOptionsSymbols(strategies, this.brokerage);
    await Option.expireOptions(portfolios);
    // await this.runOrderLoop();
  }

  public static createWorker(user: User) {
    let workerData = {
      userId: user.id.toString(),
      brokerage: user.brokerage,
    };
    let worker = new Worker(
      "./dist/controller/forwardtestController/worker.js",
      {
        workerData,
      }
    );
    worker.on("error", (message) => {
      debug(message);
    });
  }

  public async createPriceStream() {
    if (this.websocket) {
      this.websocket.close();
    }
    this.print("creating price stream");
    this.websocket = await this.brokerage.createStream(this.symbols);
  }

  public async updateStream(portfolios: Portfolio[]) {
    const symbols = await this.getSymbols(portfolios);
    const difference = new Set(
      [...this.symbols].filter((x) => !symbols.has(x))
    );
    if (difference.size > 0) {
      this.symbols = symbols;
      await this.createPriceStream();
    }
  }

  public async updatePrices(portfolios: Portfolio[]) {
    const assetList = await AssetFactory.getAssets(portfolios, this.brokerage);
    this.print("Updating prices: ", assetList.map((a) => a.symbol).join(", "));
    const tmpMap = await this.brokerage.getPrices(assetList);
    this.priceMap.setPriceFromMap(tmpMap);
  }

  public async updateUnfilledOrders() {
    await this.brokerage.updatePaperOrders(this.userId, this.priceMap);
    await this.brokerage.updateRealOrders(this.userId);
  }
}
