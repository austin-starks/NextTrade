import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "@jest/globals";
import "dotenv/config";
import mongoose from "mongoose";
import Backtester from "..";
import DbHandler from "../../../services/db";
import { MarketDataArray } from "../../../utils";
import {
  AllocationEnum,
  BrokerageEnum,
  BuyOrSellEnum,
  TimeIntervalEnum,
} from "../../../utils/enums";
import { PurchaseAndSaleAllocation } from "../../allocation";
import { AbstractAsset, Stock } from "../../asset";
import {
  BacktestBrokerage,
  TestBrokerage,
  TestBrokerageWithMarketHistorySpy,
} from "../../brokerage";
import {
  AndCondition,
  EnoughTimePassedCondition,
  HavePositionCondition,
  PortfolioIsProfitableCondition,
} from "../../conditions";
import Portfolio, { MockPortfolio } from "../../portfolio";
import Strategy, { IStrategy } from "../../strategy";
import { Duration } from "../../time";

const dbHandler = new DbHandler("test");
const userId = new mongoose.Types.ObjectId() as any;

beforeAll(async () => {
  await dbHandler.connect();
});

beforeEach(async () => {});

afterEach(async () => await dbHandler.clearDatabase());

afterAll(async () => {
  await dbHandler.closeDatabase();
});

describe("Test the backtest backtester", () => {
  test("Cannot initialize backtester with an end date before the start date", async () => {
    const startDate = new Date("2022-01-01");
    const endDate = new Date("2021-01-02");
    const brokerage = new BacktestBrokerage({
      brokerage: new TestBrokerage({
        name: BrokerageEnum.TEST,
        authDetails: null,
      }),
    });
    try {
      await Backtester.create({
        startDate,
        endDate,
        portfolio: createMockPortfolio(new Stock("AAPL")),
        userId: null,
        name: "test",
        brokerage: brokerage,
        interval: TimeIntervalEnum.DAY,
      });
      throw new Error(
        "Should not be able to create a backtester with an end date before the start date"
      );
    } catch (error) {
      expect(error.message).toBe("End date must be after start date");
    }
  });

  test("initializeAssetHistory throws an Error if start date is before the first date in the market history", async () => {
    const startDate = new Date("2021-01-01");
    const endDate = new Date("2022-01-01");
    const brokerage = new TestBrokerage({
      name: BrokerageEnum.TEST,
      authDetails: null,
    });
    const asset = new Stock("AAPL");
    const marketData: MarketDataArray = [
      {
        date: "2021-03-01",
        open: 120,
        close: 125,
        high: 126,
        low: 120,
        volume: 10000,
      },
      {
        date: "2021-03-02",
        open: 125,
        close: 126,
        high: 130,
        low: 124,
        volume: 11000,
      },
    ];
    brokerage.constructRealisticMarketDict(asset, marketData);
    try {
      await Backtester.create({
        startDate,
        endDate,
        portfolio: createMockPortfolio(asset),
        userId: null,
        name: "test",
        brokerage: BacktestBrokerage.create(brokerage),
        interval: TimeIntervalEnum.DAY,
      });
      throw new Error("Should not be able to check if asset exists");
    } catch (error) {
      expect(error.name).toBe("ValidationError");
    }
  });

  test("getPrice throws an Error if the price doesn't exist in the history", async () => {
    const startDate = new Date("2021-01-01");
    const endDate = new Date("2022-01-02");
    const brokerage = new TestBrokerage({
      name: BrokerageEnum.TEST,
      authDetails: null,
    });
    try {
      const backtester = await Backtester.create({
        startDate,
        endDate,
        portfolio: createMockPortfolio(new Stock("AAPL")),
        userId: null,
        name: "test",
        brokerage: BacktestBrokerage.create(brokerage),
        interval: TimeIntervalEnum.DAY,
      });
      backtester.getPrices().getDynamicPrice(new Stock("AAPL"), null);
      throw new Error("Should not be able to check if asset exists");
    } catch (error) {
      expect(error.name).toBe("ValidationError");
    }
  });

  test("initializeAssetHistory doesn't throw an error if asset exists", async () => {
    const startDate = new Date("2021-03-01");
    const endDate = new Date("2022-01-01");
    const brokerage = new TestBrokerage({
      name: BrokerageEnum.TEST,
      authDetails: null,
    });
    const marketData: MarketDataArray = [
      {
        date: "2021-03-01",
        open: 120,
        close: 125,
        high: 126,
        low: 120,
        volume: 10000,
      },
      {
        date: "2021-03-02",
        open: 125,
        close: 126,
        high: 130,
        low: 124,
        volume: 11000,
      },
    ];
    brokerage.constructRealisticMarketDict(new Stock("AAPL"), marketData);
    let backtester = await Backtester.create({
      startDate,
      endDate,
      portfolio: createMockPortfolio(new Stock("AAPL")),
      userId: null,
      name: "test",
      brokerage: BacktestBrokerage.create(brokerage),
      interval: TimeIntervalEnum.DAY,
    });
    expect(backtester).not.toBeNull();
  });

  test("marketIsOpen returns False when the market is closed", async () => {
    const startDate = new Date("2021-03-03");
    const endDate = new Date("2022-01-01");
    const brokerage = new TestBrokerage({
      name: BrokerageEnum.TEST,
      authDetails: null,
    });
    const marketData: MarketDataArray = [
      {
        date: "2021-03-01",
        open: 120,
        close: 125,
        high: 126,
        low: 120,
        volume: 10000,
      },
      {
        date: "2021-03-02",
        open: 125,
        close: 126,
        high: 130,
        low: 124,
        volume: 11000,
      },
      {
        date: "2021-03-05",
        open: 126,
        close: 124,
        high: 130,
        low: 124,
        volume: 12000,
      },
    ];
    brokerage.constructRealisticMarketDict(new Stock("AAPL"), marketData);
    let backtester = await Backtester.create({
      startDate,
      endDate,
      portfolio: createMockPortfolio(new Stock("AAPL")),
      userId: null,
      name: "test",
      brokerage: BacktestBrokerage.create(brokerage),
      interval: TimeIntervalEnum.DAY,
    });

    expect(backtester.marketIsOpen()).toBe(false);
  });

  test("marketIsOpen returns True when the market is open", async () => {
    const startDate = new Date("2021-03-01");
    const endDate = new Date("2022-01-01");
    const brokerage = new TestBrokerage({
      name: BrokerageEnum.TEST,
      authDetails: null,
    });
    const marketData: MarketDataArray = [
      {
        date: "2021-03-01",
        open: 120,
        close: 125,
        high: 126,
        low: 120,
        volume: 10000,
      },
      {
        date: "2021-03-02",
        open: 125,
        close: 126,
        high: 130,
        low: 124,
        volume: 11000,
      },
      {
        date: "2021-03-05",
        open: 126,
        close: 124,
        high: 130,
        low: 124,
        volume: 12000,
      },
    ];
    brokerage.constructRealisticMarketDict(new Stock("AAPL"), marketData);
    let backtester = await Backtester.create({
      startDate,
      endDate,
      portfolio: createMockPortfolio(new Stock("AAPL")),
      userId: null,
      name: "test",
      brokerage: BacktestBrokerage.create(brokerage),
      interval: TimeIntervalEnum.DAY,
    });
    expect(backtester.marketIsOpen()).toBe(true);
  });

  test("initializeAssetHistory doesn't call the brokerage twice with the same asset", async () => {
    const startDate = new Date("2021-03-01");
    const endDate = new Date("2022-03-03");
    const brokerage = new TestBrokerageWithMarketHistorySpy({
      name: BrokerageEnum.TEST_WITH_MARKET_HISTORY_SPY,
      authDetails: null,
    });
    const marketData: MarketDataArray = [
      {
        date: "2021-03-01",
        open: 120,
        close: 125,
        high: 126,
        low: 120,
        volume: 10000,
      },
      {
        date: "2021-03-02",
        open: 125,
        close: 126,
        high: 130,
        low: 124,
        volume: 11000,
      },
      {
        date: "2021-03-05",
        open: 126,
        close: 124,
        high: 130,
        low: 124,
        volume: 12000,
      },
    ];
    brokerage.constructRealisticMarketDict(new Stock("AAPL"), marketData);
    const backtester = await Backtester.create({
      startDate,
      endDate,
      portfolio: createMockPortfolio(new Stock("AAPL")),
      userId: null,
      name: "test",
      brokerage: BacktestBrokerage.create(brokerage),
      interval: TimeIntervalEnum.DAY,
    });
    const brokerageSpy =
      backtester.brokerage.getInternalBrokerage() as TestBrokerageWithMarketHistorySpy;
    expect(brokerageSpy.getMarketHistoryCount).toBe(1);
    await backtester.run({
      saveOnRun: false,
      generateBaseline: false,
    });
    expect(brokerageSpy.getMarketHistoryCount).toBe(1);
  });

  test("getPrices returns the priceMap of the correct bid/ask/mid", async () => {
    const startDate = new Date("2021-03-01");
    const endDate = new Date("2022-01-01");
    const brokerage = new TestBrokerageWithMarketHistorySpy({
      name: BrokerageEnum.TEST,
      authDetails: null,
    });
    const marketData: MarketDataArray = [
      {
        date: "2021-03-01",
        open: 120,
        close: 125,
        high: 126,
        low: 120,
        volume: 10000,
      },
      {
        date: "2021-03-02",
        open: 125,
        close: 126,
        high: 130,
        low: 124,
        volume: 11000,
      },
      {
        date: "2021-03-05",
        open: 126,
        close: 124,
        high: 130,
        low: 124,
        volume: 12000,
      },
    ];
    brokerage.constructRealisticMarketDict(new Stock("AAPL"), marketData);
    let backtester = await Backtester.create({
      startDate,
      endDate,
      portfolio: createMockPortfolio(new Stock("AAPL")),
      userId: null,
      name: "test",
      brokerage: BacktestBrokerage.create(brokerage),
      interval: TimeIntervalEnum.DAY,
    });
    let prices = backtester.getPrices();
    expect(prices.getPriceObj("AAPL").bid).toBeLessThanOrEqual(120);
    expect(prices.getPriceObj("AAPL").mid).toBe(120);
    expect(prices.getPriceObj("AAPL").ask).toBeGreaterThanOrEqual(120);
    expect(prices.getPriceObj("AAPL").open).toBe(120);
    expect(prices.getPriceObj("AAPL").high).toBe(120);
    expect(prices.getPriceObj("AAPL").low).toBe(120);
  });

  test("getPrices returns the priceMap of the correct bid/ask/mid after one time increment", async () => {
    const startDate = new Date("2021-03-01");
    const endDate = new Date("2022-01-01");
    const brokerage = new TestBrokerageWithMarketHistorySpy({
      name: BrokerageEnum.TEST,
      authDetails: null,
    });
    const marketData: MarketDataArray = [
      {
        date: "2021-03-01",
        open: 120,
        close: 125,
        high: 126,
        low: 120,
        volume: 10000,
      },
      {
        date: "2021-03-02",
        open: 125,
        close: 126,
        high: 130,
        low: 124,
        volume: 11000,
      },
      {
        date: "2021-03-05",
        open: 126,
        close: 124,
        high: 130,
        low: 124,
        volume: 12000,
      },
    ];
    brokerage.constructRealisticMarketDict(new Stock("AAPL"), marketData);
    let backtester = await Backtester.create({
      startDate,
      endDate,
      portfolio: createMockPortfolio(new Stock("AAPL")),
      userId: null,
      name: "test",
      brokerage: BacktestBrokerage.create(brokerage),
      interval: TimeIntervalEnum.DAY,
    });
    backtester.incrementTime();
    let prices = backtester.getPrices();
    expect(prices.getPriceObj("AAPL").bid).toBeLessThan(125);
    expect(prices.getPriceObj("AAPL").mid).toBe(125);
    expect(prices.getPriceObj("AAPL").ask).toBeGreaterThan(125);
    expect(prices.getPriceObj("AAPL").open).toBe(120);
    expect(prices.getPriceObj("AAPL").close).toBe(125);
    expect(prices.getPriceObj("AAPL").high).toBe(126);
    expect(prices.getPriceObj("AAPL").low).toBe(120);
  });

  test("getPrices returns the priceMap of the correct bid/ask/mid after two time increments", async () => {
    const startDate = new Date("2021-03-01");
    const endDate = new Date("2022-01-01");
    const brokerage = new TestBrokerageWithMarketHistorySpy({
      name: BrokerageEnum.TEST,
      authDetails: null,
    });
    const marketData: MarketDataArray = [
      {
        date: "2021-03-01",
        open: 120,
        close: 125,
        high: 126,
        low: 120,
        volume: 10000,
      },
      {
        date: "2021-03-02",
        open: 125,
        close: 126,
        high: 130,
        low: 124,
        volume: 11000,
      },
      {
        date: "2021-03-05",
        open: 126,
        close: 124,
        high: 130,
        low: 124,
        volume: 12000,
      },
    ];
    brokerage.constructRealisticMarketDict(new Stock("AAPL"), marketData);
    let backtester = await Backtester.create({
      startDate,
      endDate,
      portfolio: createMockPortfolio(new Stock("AAPL")),
      userId: null,
      name: "test",
      brokerage: BacktestBrokerage.create(brokerage),
      interval: TimeIntervalEnum.DAY,
    });
    backtester.incrementTime();
    backtester.incrementTime();
    let prices = backtester.getPrices();
    expect(prices.getPriceObj("AAPL").bid).toBeLessThanOrEqual(125);
    expect(prices.getPriceObj("AAPL").mid).toBe(125);
    expect(prices.getPriceObj("AAPL").ask).toBeGreaterThanOrEqual(125);
    expect(prices.getPriceObj("AAPL").open).toBe(125);
    expect(prices.getPriceObj("AAPL").high).toBe(125);
    expect(prices.getPriceObj("AAPL").low).toBe(125);
  });

  test("getPrices returns the priceMap of the correct bid/ask/mid after three time increments", async () => {
    const startDate = new Date("2021-03-01");
    const endDate = new Date("2022-01-01");
    const brokerage = new TestBrokerageWithMarketHistorySpy({
      name: BrokerageEnum.TEST,
      authDetails: null,
    });
    const marketData: MarketDataArray = [
      {
        date: "2021-03-01",
        open: 120,
        close: 125,
        high: 126,
        low: 120,
        volume: 10000,
      },
      {
        date: "2021-03-02",
        open: 125,
        close: 126,
        high: 130,
        low: 124,
        volume: 11000,
      },
      {
        date: "2021-03-05",
        open: 126,
        close: 124,
        high: 130,
        low: 124,
        volume: 12000,
      },
    ];
    brokerage.constructRealisticMarketDict(new Stock("AAPL"), marketData);
    let backtester = await Backtester.create({
      startDate,
      endDate,
      portfolio: createMockPortfolio(new Stock("AAPL")),
      userId: null,
      name: "test",
      brokerage: BacktestBrokerage.create(brokerage),
      interval: TimeIntervalEnum.DAY,
    });
    backtester.incrementTime();
    backtester.incrementTime();
    backtester.incrementTime();
    let prices = backtester.getPrices();
    expect(prices.getPriceObj("AAPL").bid).toBeLessThanOrEqual(126);
    expect(prices.getPriceObj("AAPL").mid).toBe(126);
    expect(prices.getPriceObj("AAPL").ask).toBeGreaterThanOrEqual(126);
    expect(prices.getPriceObj("AAPL").open).toBe(125);
    expect(prices.getPriceObj("AAPL").high).toBe(130);
    expect(prices.getPriceObj("AAPL").low).toBe(124);
  });

  test("(integration) the main run function successfully goes through a full cycle", async () => {
    const startDate = new Date("2021-03-01");
    const endDate = new Date("2021-03-02");
    const brokerage = new TestBrokerage({
      name: BrokerageEnum.TEST,
      authDetails: null,
    });
    const marketData: MarketDataArray = [
      {
        date: "2021-03-01",
        open: 120,
        close: 125,
        high: 126,
        low: 120,
        volume: 10000,
      },
      {
        date: "2021-03-02",
        open: 125,
        close: 126,
        high: 130,
        low: 124,
        volume: 11000,
      },
      {
        date: "2021-03-05",
        open: 126,
        close: 124,
        high: 130,
        low: 124,
        volume: 12000,
      },
    ];
    brokerage.constructRealisticMarketDict(new Stock("AAPL"), marketData);

    const portfolio = new Portfolio({
      userId: userId,
      name: "strategy collection",
      initialValue: 100000,
    });
    const strategyObj: IStrategy = {
      name: "Buy AAPL Stock",
      userId: userId,
      buyingConditions: [],
      sellingConditions: [],
      targetAsset: new Stock("AAPL"),
      buyAmount: new PurchaseAndSaleAllocation({
        amount: 40,
        type: AllocationEnum.PERCENT_OF_BUYING_POWER,
      }),
      sellAmount: new PurchaseAndSaleAllocation({
        amount: 20,
        type: AllocationEnum.PERCENT_OF_CURRENT_POSITIONS,
      }),
    };
    const strategy = new Strategy(strategyObj);
    portfolio.addStrategy(strategy);
    let backtester = await Backtester.create({
      startDate,
      endDate,
      userId: null,
      name: "test",
      portfolio: new MockPortfolio(portfolio),
      brokerage: BacktestBrokerage.create(brokerage),
      interval: TimeIntervalEnum.DAY,
    });
    await backtester.run({ saveOnRun: true, generateBaseline: false });
    const mockPortfolio = backtester.portfolio;
    expect(mockPortfolio.calculateValue(backtester.getPrices())).toBe(100000);
  });

  test("(integration) the main run function successfully goes through a full cycle with buying conditions", async () => {
    const startDate = new Date("2021-03-01");
    const endDate = new Date("2021-03-02");
    const brokerage = new TestBrokerage({
      name: BrokerageEnum.TEST,
      authDetails: null,
    });
    const marketData: MarketDataArray = [
      {
        date: "2021-03-01",
        open: 100,
        close: 110,
        high: 111,
        low: 100,
        volume: 10000,
      },
      {
        date: "2021-03-02",
        open: 110,
        close: 110,
        high: 130,
        low: 110,
        volume: 11000,
      },
      {
        date: "2021-03-05",
        open: 110,
        close: 90,
        high: 130,
        low: 80,
        volume: 12000,
      },
    ];
    brokerage.constructRealisticMarketDict(new Stock("AAPL"), marketData);

    const portfolio = new Portfolio({
      userId: userId,
      name: "strategy collection",
      initialValue: 100000,
    });
    const strategyObj: IStrategy = {
      name: "Buy AAPL Stock",
      userId: userId,
      buyingConditions: [],
      sellingConditions: [],
      targetAsset: new Stock("AAPL"),
      buyAmount: new PurchaseAndSaleAllocation({
        amount: 50,
        type: AllocationEnum.PERCENT_OF_BUYING_POWER,
      }),
      sellAmount: new PurchaseAndSaleAllocation({
        amount: 25,
        type: AllocationEnum.PERCENT_OF_CURRENT_POSITIONS,
      }),
    };
    const strategy = new Strategy(strategyObj);
    strategy.addBuyingCondition(
      HavePositionCondition.HaveNoPositions([new Stock("AAPL")])
    );
    portfolio.addStrategy(strategy);
    let backtester = await Backtester.create({
      startDate,
      endDate,
      userId: null,
      name: "test",
      portfolio: new MockPortfolio(portfolio),
      brokerage: BacktestBrokerage.create(brokerage),
      interval: TimeIntervalEnum.DAY,
    });

    await backtester.run({ saveOnRun: true, generateBaseline: false });
    const mockPortfolio = backtester.portfolio;
    // should charge a commission of PAPER_CONFIG_BACKTEST
    // {
    //   stockCommission: { val: 005, type: PercentOrDollarsEnum.PERCENT }0,
    //   cryptoCommission: { val: 01, type: PercentOrDollarsEnum.PERCENT }0,
    //   optionCommission: { val: 02, type: PercentOrDollarsEnum.PERCENT }0,
    // }
    expect(mockPortfolio.positions[0].symbol).toBe("AAPL");
  });

  test("(integration) the main run function successfully goes through a full cycle and increases in value the next day", async () => {
    const startDate = new Date("2021-03-01");
    const endDate = new Date("2021-03-02");
    const brokerage = new TestBrokerage({
      name: BrokerageEnum.TEST,
      authDetails: null,
    });
    const marketData: MarketDataArray = [
      {
        date: "2021-03-01",
        open: 100,
        close: 110,
        high: 111,
        low: 100,
        volume: 10000,
      },
      {
        date: "2021-03-02",
        open: 110,
        close: 110,
        high: 130,
        low: 110,
        volume: 11000,
      },
      {
        date: "2021-03-05",
        open: 110,
        close: 90,
        high: 130,
        low: 80,
        volume: 12000,
      },
    ];
    brokerage.constructRealisticMarketDict(new Stock("AAPL"), marketData);

    const portfolio = new Portfolio({
      userId: userId,
      name: "strategy collection",
      initialValue: 100000,
    });
    const strategyObj: IStrategy = {
      name: "Buy AAPL Stock",
      userId: userId,
      buyingConditions: [],
      sellingConditions: [],
      targetAsset: new Stock("AAPL"),
      buyAmount: new PurchaseAndSaleAllocation({
        amount: 50,
        type: AllocationEnum.PERCENT_OF_BUYING_POWER,
      }),
      sellAmount: new PurchaseAndSaleAllocation({
        amount: 25,
        type: AllocationEnum.PERCENT_OF_CURRENT_POSITIONS,
      }),
    };
    const strategy = new Strategy(strategyObj);
    strategy.addBuyingCondition(
      HavePositionCondition.HaveNoPositions([new Stock("AAPL")])
    );
    portfolio.addStrategy(strategy);
    let backtester = await Backtester.create({
      startDate,
      endDate,
      userId: null,
      name: "test",
      portfolio: new MockPortfolio(portfolio),
      brokerage: BacktestBrokerage.create(brokerage),
      interval: TimeIntervalEnum.DAY,
    });

    await backtester.run({ saveOnRun: true, generateBaseline: false });
    const mockPortfolio = backtester.portfolio;
    // should charge a commission of PAPER_CONFIG_BACKTEST
    // {
    //   stockCommission: { val: 005, type: PercentOrDollarsEnum.PERCENT }0,
    //   cryptoCommission: { val: 01, type: PercentOrDollarsEnum.PERCENT }0,
    //   optionCommission: { val: 02, type: PercentOrDollarsEnum.PERCENT }0,
    // }
    expect(
      mockPortfolio.calculateValue(backtester.getPrices())
    ).toBeGreaterThan(100000);
    expect(mockPortfolio.positions[0].averageCost).toBe(100);
    expect(mockPortfolio.positions[0].lastPrice).toBe(110);
    expect(backtester.successfulBuyHistory.length).toBe(1);
  });

  test("(integration) the main run function sells when a selling condition is met", async () => {
    const startDate = new Date("2021-03-01");
    const endDate = new Date("2021-03-02");
    const brokerage = new TestBrokerage({
      name: BrokerageEnum.TEST,
      authDetails: null,
    });
    const marketData: MarketDataArray = [
      {
        date: "2021-03-01",
        open: 100,
        close: 110,
        high: 111,
        low: 100,
        volume: 10000,
      },
      {
        date: "2021-03-02",
        open: 110,
        close: 110,
        high: 130,
        low: 110,
        volume: 11000,
      },
      {
        date: "2021-03-05",
        open: 110,
        close: 90,
        high: 130,
        low: 80,
        volume: 12000,
      },
    ];
    brokerage.constructRealisticMarketDict(new Stock("AAPL"), marketData);

    const portfolio = new Portfolio({
      userId: userId,
      name: "strategy collection",
      initialValue: 100000,
    });
    const strategyObj: IStrategy = {
      name: "Buy AAPL Stock",
      userId: userId,
      buyingConditions: [],
      sellingConditions: [],
      targetAsset: new Stock("AAPL"),
      buyAmount: new PurchaseAndSaleAllocation({
        amount: 50,
        type: AllocationEnum.PERCENT_OF_BUYING_POWER,
      }),
      sellAmount: new PurchaseAndSaleAllocation({
        amount: 100,
        type: AllocationEnum.PERCENT_OF_CURRENT_POSITIONS,
      }),
    };
    const strategy = new Strategy(strategyObj);
    const andCondition = new AndCondition({});
    await andCondition.addAll([
      HavePositionCondition.HaveNoPositions([new Stock("AAPL")]),
      new EnoughTimePassedCondition({
        side: BuyOrSellEnum.BUY,
        duration: new Duration(3, TimeIntervalEnum.DAY),
      }),
    ]);
    strategy.addBuyingCondition(andCondition);
    strategy.addSellingCondition(new PortfolioIsProfitableCondition());
    portfolio.addStrategy(strategy);
    let backtester = await Backtester.create({
      startDate,
      endDate,
      name: "test",
      userId: new mongoose.Types.ObjectId() as any,
      portfolio: new MockPortfolio(portfolio),
      brokerage: BacktestBrokerage.create(brokerage),
      interval: TimeIntervalEnum.DAY,
    });

    await backtester.run({ saveOnRun: true, generateBaseline: false });
    const mockPortfolio = backtester.portfolio;
    // should charge a commission of PAPER_CONFIG_BACKTEST
    // {
    //   stockCommission: { val: 005, type: PercentOrDollarsEnum.PERCENT }0,
    //   cryptoCommission: { val: 01, type: PercentOrDollarsEnum.PERCENT }0,
    //   optionCommission: { val: 02, type: PercentOrDollarsEnum.PERCENT }0,
    // }
    const priceMap = backtester.getPrices();
    expect(mockPortfolio.calculateValue(priceMap)).toBeGreaterThan(100000);
    expect(backtester.successfulBuyHistory.length).toBe(1);
    expect(backtester.successfulSellHistory.length).toBe(1);
    expect(mockPortfolio.positions.length).toBe(0);
  });

  test("(integration) can load a backtest and run it", async () => {
    const startDate = new Date("2021-03-01");
    const endDate = new Date("2021-03-02");
    const brokerage = new TestBrokerage({
      name: BrokerageEnum.TEST,
      authDetails: null,
    });
    const marketData: MarketDataArray = [
      {
        date: "2021-03-01",
        open: 100,
        close: 110,
        high: 111,
        low: 100,
        volume: 10000,
      },
      {
        date: "2021-03-02",
        open: 110,
        close: 110,
        high: 130,
        low: 110,
        volume: 11000,
      },
      {
        date: "2021-03-05",
        open: 110,
        close: 90,
        high: 130,
        low: 80,
        volume: 12000,
      },
    ];
    brokerage.constructRealisticMarketDict(new Stock("AAPL"), marketData);

    const portfolio = new Portfolio({
      userId: userId,
      name: "strategy collection",
      initialValue: 100000,
    });
    const strategyObj: IStrategy = {
      name: "Buy AAPL Stock",
      userId: userId,
      buyingConditions: [],
      sellingConditions: [],
      targetAsset: new Stock("AAPL"),
      buyAmount: new PurchaseAndSaleAllocation({
        amount: 50,
        type: AllocationEnum.PERCENT_OF_BUYING_POWER,
      }),
      sellAmount: new PurchaseAndSaleAllocation({
        amount: 100,
        type: AllocationEnum.PERCENT_OF_CURRENT_POSITIONS,
      }),
    };
    const strategy = new Strategy(strategyObj);
    const andCondition = new AndCondition({});
    andCondition.addAll([
      HavePositionCondition.HaveNoPositions([new Stock("AAPL")]),
      new EnoughTimePassedCondition({
        side: BuyOrSellEnum.BUY,
        duration: new Duration(3, TimeIntervalEnum.DAY),
      }),
    ]);
    strategy.addBuyingCondition(andCondition);
    strategy.addSellingCondition(new PortfolioIsProfitableCondition());
    portfolio.addStrategy(strategy);
    await portfolio.save();
    const create = await Backtester.create({
      startDate,
      endDate,
      name: "test",
      userId: userId,
      portfolio: new MockPortfolio(portfolio),
      brokerage: BacktestBrokerage.create(brokerage),
      interval: TimeIntervalEnum.DAY,
    });
    const backtester = await Backtester.findOneAndRun(
      create._id,
      userId,
      BacktestBrokerage.create(brokerage),
      { saveOnRun: true, generateBaseline: false }
    );

    const mockPortfolio = backtester.portfolio;
    // should charge a commission of PAPER_CONFIG_BACKTEST
    // {
    //   stockCommission: { val: 005, type: PercentOrDollarsEnum.PERCENT }0,
    //   cryptoCommission: { val: 01, type: PercentOrDollarsEnum.PERCENT }0,
    //   optionCommission: { val: 02, type: PercentOrDollarsEnum.PERCENT }0,
    // }
    expect(backtester.successfulBuyHistory.length).toBe(1);
    expect(backtester.successfulSellHistory.length).toBe(1);
    expect(mockPortfolio.positions.length).toBe(0);
  });

  test("(integration) the main run function to ensure we can't buy when we have no buying power", async () => {
    const startDate = new Date("2021-03-01");
    const endDate = new Date("2021-03-02");
    const brokerage = new TestBrokerage({
      name: BrokerageEnum.TEST,
      authDetails: null,
    });
    brokerage.constructRealisticMarketDict(new Stock("AAPL"), [
      {
        date: "2021-03-01",
        open: 100,
        close: 110,
        high: 111,
        low: 100,
        volume: 10000,
      },
      {
        date: "2021-03-02",
        open: 110,
        close: 110,
        high: 130,
        low: 110,
        volume: 11000,
      },
      {
        date: "2021-03-05",
        open: 110,
        close: 90,
        high: 130,
        low: 80,
        volume: 12000,
      },
    ]);
    brokerage.constructRealisticMarketDict(new Stock("QQQ"), [
      {
        date: "2021-03-01",
        open: 100,
        close: 110,
        high: 111,
        low: 100,
        volume: 10000,
      },
      {
        date: "2021-03-02",
        open: 110,
        close: 110,
        high: 130,
        low: 110,
        volume: 11000,
      },
      {
        date: "2021-03-05",
        open: 110,
        close: 90,
        high: 130,
        low: 80,
        volume: 12000,
      },
    ]);

    const portfolio = new Portfolio({
      name: "test",
      initialValue: 10000,
      userId: userId,
    });
    const strategyObj: IStrategy = {
      name: "Buy AAPL Stock",
      userId: userId,
      buyingConditions: [],
      sellingConditions: [],
      targetAsset: new Stock("AAPL"),
      buyAmount: new PurchaseAndSaleAllocation({
        amount: 100,
        type: AllocationEnum.PERCENT_OF_BUYING_POWER,
      }),
      sellAmount: new PurchaseAndSaleAllocation({
        amount: 100,
        type: AllocationEnum.PERCENT_OF_CURRENT_POSITIONS,
      }),
    };
    const strategy = new Strategy(strategyObj);
    strategy.addBuyingCondition(
      HavePositionCondition.HaveNoPositions([
        new Stock("AAPL"),
        new Stock("QQQ"),
      ])
    );
    strategy.addBuyingCondition(
      HavePositionCondition.HavePosition([new Stock("AAPL")])
    );
    portfolio.addStrategy(strategy);
    let backtester = await Backtester.create({
      startDate,
      endDate,
      userId: null,
      name: "test",
      portfolio: new MockPortfolio(portfolio),
      brokerage: BacktestBrokerage.create(brokerage),
      interval: TimeIntervalEnum.DAY,
    });
    await backtester.run({ saveOnRun: true, generateBaseline: false });
    expect(backtester.portfolio.positions.length).toBeGreaterThan(0);
  });
});

function createMockPortfolio(asset: AbstractAsset): MockPortfolio {
  const portfolio = new MockPortfolio({
    name: "test",
    initialValue: 10000,
    userId: userId,
  });
  portfolio.addStrategies([
    new Strategy({
      name: "Test Strategy",
      userId: userId,
      targetAsset: asset,
      buyAmount: null,
      sellAmount: null,
      buyingConditions: [],
      sellingConditions: [],
    }),
  ]);
  return portfolio;
}
