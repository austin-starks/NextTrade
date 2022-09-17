import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "@jest/globals";
import { MovingAveragePriceCondition } from "..";
import DbHandler from "../../../services/db";
import {
  AllocationEnum,
  BrokerageEnum,
  Comparator,
  OhlcEnum,
  StatisticsEnum,
  TimeIntervalEnum,
} from "../../../utils/enums";
import { PurchaseAndSaleAllocation } from "../../allocation";
import { Stock } from "../../asset";
import { TestBrokerage } from "../../brokerage";
import Portfolio from "../../portfolio";
import PriceMap from "../../priceMap";
import Strategy, { IStrategy } from "../../strategy";
import { Duration } from "../../time";
import User from "../../user";

const dbHandler: DbHandler = new DbHandler("test");
var strategy: Strategy;
var assetName: string;
var user: User;

beforeAll(async () => {
  await dbHandler.connect();
});

beforeEach(async () => {
  const userInfo = {
    password: "12345678",
    phoneNumber: "555-555-5555",
    firstName: "John",
    lastName: "Doe",

    email: "example@gmail.com",
    brokerage: {
      name: BrokerageEnum.TRADIER,
      authDetails: {
        token: process.env.TRADIER_TOKEN,
        accountId: process.env.TRADIER_ACCOUNT_ID,
      },
    },
  };
  user = new User(userInfo);
  await user.save();
  const strategyObj: IStrategy = {
    name: "Buy Driv Option",
    userId: user.id,
    targetAsset: new Stock("DRIV"),
    buyAmount: new PurchaseAndSaleAllocation({
      amount: 0.4,
      type: AllocationEnum.PERCENT_OF_BUYING_POWER,
    }),
    sellAmount: new PurchaseAndSaleAllocation({
      amount: 0.2,
      type: AllocationEnum.PERCENT_OF_CURRENT_POSITIONS,
    }),
  };
  strategy = new Strategy(strategyObj);
  assetName = strategy.targetAsset.name;
});

afterEach(async () => await dbHandler.clearDatabase());

afterAll(async () => {
  await dbHandler.closeDatabase();
});

describe("Moving Average Price Condition Tests", () => {
  test("Test MovingAveragePriceCondition for mean open price", async () => {
    // must be less than the mean open to return true
    const condition = new MovingAveragePriceCondition({
      comparator: Comparator.LESS_THAN,
      standardDeviation: 0,
      duration: new Duration(5, TimeIntervalEnum.DAY),
      ohlc: OhlcEnum.OPEN,
      statisticalMethod: StatisticsEnum.MEAN,
    });
    const brokerage = new TestBrokerage({
      name: BrokerageEnum.TEST,
      authDetails: null,
    });
    let isTrue: boolean;
    let priceMap: PriceMap = new PriceMap();
    let portfolio = await Portfolio.findByStrategy(strategy, user.id);

    // open should be less than or equal to 9
    brokerage.constructFakeMarketDict(
      strategy.targetAsset,
      [20, 23, 25, 29, 26, 32, 34, 49, 28, 31, 7, 8, 9, 10, 11],
      OhlcEnum.OPEN
    );
    priceMap.set(assetName, {
      bid: 10,
      mid: 10,
      ask: 10,
      high: 10,
      low: 10,
    });

    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: brokerage,
      portfolio: portfolio,
      priceMap: priceMap,
      currentTime: new Date(),
    });
    expect(isTrue).toEqual(false);

    // open should be less than or equal to 9
    priceMap.set(assetName, { bid: 8, mid: 8, ask: 8, high: 8, low: 8 });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: brokerage,
      portfolio: portfolio,
      priceMap: priceMap,
      currentTime: new Date(),
    });
    expect(isTrue).toEqual(true);
  });

  test("Test MovingAveragePriceCondition for low close price + 1 SD", async () => {
    // must be less or equal to than the lowest 'OHLC-high' to return true
    const condition = new MovingAveragePriceCondition({
      comparator: Comparator.LESS_THAN_OR_EQUAL_TO,
      standardDeviation: 1,
      duration: new Duration(5, TimeIntervalEnum.DAY),
      ohlc: OhlcEnum.HIGH,
      statisticalMethod: StatisticsEnum.LOW,
    });
    const brokerage = new TestBrokerage({
      name: BrokerageEnum.TEST,
      authDetails: null,
    });
    let isTrue: boolean;
    let priceMap: PriceMap = new PriceMap();
    let portfolio = await Portfolio.findByStrategy(strategy, user.id);

    // high should be less than or equal to 7+1.414 (the lowest high price)
    // must be less or equal to than the low 'OHLC-high' to return true
    brokerage.constructFakeMarketDict(
      strategy.targetAsset,
      [20, 23, 25, 29, 26, 32, 34, 49, 28, 31, 7, 8, 9, 10, 11],
      OhlcEnum.HIGH
    );
    // high should be less than or equal to 7+1.414 (the lowest high price)
    priceMap.set(assetName, {
      bid: 10,
      mid: 10,
      ask: 10,
      high: 10,
      low: 10,
    });

    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: brokerage,
      portfolio: portfolio,
      priceMap: priceMap,
      currentTime: new Date(),
    });
    expect(isTrue).toEqual(false);

    // high should be less than or equal to 7+1.414 (the lowest high price)
    priceMap.set(assetName, {
      bid: 8.3,
      mid: 8.3,
      ask: 8.3,
      high: 8.3,
      low: 8.3,
    });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: brokerage,
      portfolio: portfolio,
      priceMap: priceMap,
      currentTime: new Date(),
    });
    expect(isTrue).toEqual(true);

    // close should be greater than or equal to 7 (the low close price)
    priceMap.set(assetName, { bid: 6, mid: 6, ask: 6, high: 6, low: 6 });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: brokerage,
      portfolio: portfolio,
      priceMap: priceMap,
      currentTime: new Date(),
    });
    expect(isTrue).toEqual(true);
  });

  test("Test MovingAveragePriceCondition for low close price", async () => {
    // must be less than the mean open to return true
    const condition = new MovingAveragePriceCondition({
      comparator: Comparator.GREATER_THAN_OR_EQUAL_TO,
      standardDeviation: 0,
      duration: new Duration(5, TimeIntervalEnum.DAY),
      ohlc: OhlcEnum.CLOSE,
      statisticalMethod: StatisticsEnum.LOW,
    });
    const brokerage = new TestBrokerage({
      name: BrokerageEnum.TEST,
      authDetails: null,
    });
    let isTrue: boolean;
    let priceMap: PriceMap = new PriceMap();
    let portfolio = await Portfolio.findByStrategy(strategy, user.id);

    // close should be greater than or equal to 8 (the low close price)
    brokerage.constructFakeMarketDict(
      strategy.targetAsset,
      [20, 23, 25, 29, 26, 32, 34, 49, 28, 31, 7, 8, 9, 10, 11],
      OhlcEnum.CLOSE
    );
    priceMap.set(assetName, {
      bid: 10,
      mid: 10,
      ask: 10,
      high: 10,
      low: 10,
    });

    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: brokerage,
      portfolio: portfolio,
      priceMap: priceMap,
      currentTime: new Date(),
    });
    expect(isTrue).toEqual(true);

    // close should be greater than or equal to 8 (the low close price)
    priceMap.set(assetName, { bid: 8, mid: 8, ask: 8, high: 8, low: 8 });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: brokerage,
      portfolio: portfolio,
      priceMap: priceMap,
      currentTime: new Date(),
    });
    expect(isTrue).toEqual(true);

    // close should be greater than or equal to 7 (the low close price)
    priceMap.set(assetName, { bid: 6, mid: 6, ask: 6, high: 6, low: 6 });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: brokerage,
      portfolio: portfolio,
      priceMap: priceMap,
      currentTime: new Date(),
    });
    expect(isTrue).toEqual(false);
  });

  test("Test MovingAveragePriceCondition for high high price -1 SD", async () => {
    // must be less than the mean open to return true
    const condition = new MovingAveragePriceCondition({
      comparator: Comparator.GREATER_THAN_OR_EQUAL_TO,
      standardDeviation: -1,
      duration: new Duration(10, TimeIntervalEnum.DAY),
      ohlc: OhlcEnum.HIGH,
      statisticalMethod: StatisticsEnum.HIGH,
    });
    const brokerage = new TestBrokerage({
      name: BrokerageEnum.TEST,
      authDetails: null,
    });
    let isTrue: boolean;
    let priceMap: PriceMap = new PriceMap();
    let portfolio = await Portfolio.findByStrategy(strategy, user.id);

    // high should be greater than or equal to 11 - 1.414=9.59 (the high high price)
    brokerage.constructFakeMarketDict(
      strategy.targetAsset,
      [7, 8, 9, 10, 11],
      OhlcEnum.HIGH
    );
    priceMap.set(assetName, {
      bid: 10,
      mid: 10,
      ask: 10,
      high: 10,
      low: 10,
    });

    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: brokerage,
      portfolio: portfolio,
      priceMap: priceMap,
      currentTime: new Date(),
    });
    expect(isTrue).toEqual(true);

    // close should be greater than or equal to 7 (the low close price)
    priceMap.set(assetName, { bid: 8, mid: 8, ask: 8, high: 8, low: 8 });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: brokerage,
      portfolio: portfolio,
      priceMap: priceMap,
      currentTime: new Date(),
    });
    expect(isTrue).toEqual(false);

    // close should be greater than or equal to 7 (the low close price)
    priceMap.set(assetName, { bid: 6, mid: 6, ask: 6, high: 6, low: 6 });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: brokerage,
      portfolio: portfolio,
      priceMap: priceMap,
      currentTime: new Date(),
    });
    expect(isTrue).toEqual(false);

    // close should be greater than or equal to 7 (the low close price)
    priceMap.set(assetName, {
      bid: 10.5,
      mid: 10.5,
      ask: 10.5,
      high: 10.5,
      low: 10.5,
    });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: brokerage,
      portfolio: portfolio,
      priceMap: priceMap,
      currentTime: new Date(),
    });
    expect(isTrue).toEqual(true);
  });

  test("Test if errors fail correctly", async () => {
    // must be less than the mean open to return true
    const condition1 = new MovingAveragePriceCondition({
      comparator: "Greater than  or equal to" as Comparator,
      standardDeviation: -1,
      duration: new Duration(10, TimeIntervalEnum.DAY),
      ohlc: OhlcEnum.HIGH,
      statisticalMethod: StatisticsEnum.HIGH,
    });
    const condition2 = new MovingAveragePriceCondition({
      comparator: Comparator.GREATER_THAN_OR_EQUAL_TO,
      standardDeviation: -1,
      duration: new Duration(10, TimeIntervalEnum.DAY),
      ohlc: OhlcEnum.HIGH,
      statisticalMethod: "the high" as StatisticsEnum,
    });
    let portfolio = await Portfolio.findByStrategy(strategy, user.id);

    const brokerage = new TestBrokerage({
      name: BrokerageEnum.TEST,
      authDetails: null,
    });
    let priceMap: PriceMap = new PriceMap();

    // high should be greater than or equal to 11 - 1.414=9.59 (the high high price)
    brokerage.constructFakeMarketDict(
      strategy.targetAsset,
      [15, 11, 14, 7, 8, 9, 10, 11],
      OhlcEnum.HIGH
    );
    priceMap.set(assetName, {
      bid: 10,
      mid: 10,
      ask: 10,
      high: 10,
      low: 10,
    });

    await condition1
      .isTrue({
        strategy: strategy,
        brokerage: brokerage,
        portfolio: portfolio,
        priceMap: priceMap,
        currentTime: new Date(),
      })
      .then(() => {
        expect(1).toEqual(2);
      })
      .catch((err) => {
        expect(err).not.toEqual(null);
      });
    await condition2
      .isTrue({
        strategy: strategy,
        brokerage: brokerage,
        portfolio: portfolio,
        priceMap: priceMap,
        currentTime: new Date(),
      })
      .then(() => {
        expect(1).toEqual(2);
      })
      .catch((err) => {
        expect(err).not.toEqual(null);
      });
  });
});
