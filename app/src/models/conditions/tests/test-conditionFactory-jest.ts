import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "@jest/globals";
import {
  AndCondition,
  ConditionFactory,
  MovingAveragePriceCondition,
  PortfolioIsProfitableCondition,
  PositionPercentChangeCondition,
  SimplePriceCondition as PriceCondition,
} from "..";
import DbHandler from "../../../services/db";
import {
  AllocationEnum,
  BrokerageEnum,
  BuyOrSellEnum,
  Comparator,
  ConditionEnum,
  DeploymentEnum,
  OhlcEnum,
  OrderStatusEnum,
  OrderTypeEnum,
  StatisticsEnum,
  TimeIntervalEnum,
} from "../../../utils/enums";
import { PurchaseAndSaleAllocation } from "../../allocation";
import { Stock } from "../../asset";
import { TestBrokerage } from "../../brokerage";
import Order from "../../order";
import Portfolio from "../../portfolio";
import PriceMap from "../../priceMap";
import Strategy, { IStrategy } from "../../strategy";
import { Duration } from "../../time";
import User from "../../user";

const dbHandler: DbHandler = new DbHandler("test");
var portfolio: Portfolio;
var strategy: Strategy;
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
  portfolio = new Portfolio({
    userId: user.id,
    name: "First automated trading strategy",
    initialValue: 2000,
  });
  portfolio.addStrategy(strategy);
});

afterEach(async () => await dbHandler.clearDatabase());

afterAll(async () => {
  await dbHandler.closeDatabase();
});

describe("Condition Factory tests", () => {
  test("Test PortfolioIsProfitableCondition from factory.", async () => {
    const assetName = strategy.targetAsset.name;
    const order = new Order({
      brokerageId: "ehu7y654565432wsdfg",
      userId: user.id,
      quantity: 100,
      status: OrderStatusEnum.FILLED,
      priceOfAsset: 10,
      type: OrderTypeEnum.MARKET,
      asset: strategy.targetAsset,
      strategyId: strategy.id,
      portfolioId: portfolio._id,
      side: BuyOrSellEnum.BUY,
      deployment: DeploymentEnum.PAPER,
    });
    await portfolio.updatePositions(order);

    const conditionObj = new PortfolioIsProfitableCondition();
    strategy.addBuyingCondition(conditionObj);
    await strategy.save();

    const stratFromDb = await Strategy.findByName("Buy Driv Option", user.id);
    const conditions = ConditionFactory.createFromArray(
      stratFromDb.buyingConditions
    );
    const condition = conditions[0];

    let isTrue: boolean;
    let priceMap = new PriceMap();
    // test if price of asset decreases
    priceMap.set(assetName, {
      bid: 9.5,
      mid: 9.5,
      ask: 9.5,
      high: 9.5,
      low: 9.5,
    });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      priceMap: priceMap,
      portfolio,
      currentTime: new Date(),
    });
    expect(isTrue).toEqual(false);

    // test if price of asset stays the same
    priceMap.set(assetName, {
      bid: 10,
      mid: 10,
      ask: 10,
      high: 10,
      low: 10,
    });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      priceMap: priceMap,
      portfolio,
      currentTime: new Date(),
    });
    expect(isTrue).toEqual(false);

    // test if price of asset increases
    priceMap.set(assetName, {
      bid: 11,
      mid: 11,
      ask: 11,
      high: 11,
      low: 11,
    });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      priceMap: priceMap,
      portfolio,
      currentTime: new Date(),
    });
    expect(isTrue).toEqual(true);
  });

  test("Testing conditionFactory with PositionPercentChangeCondition", async () => {
    const order = new Order({
      brokerageId: "ehu7y654565432wsdfg",
      userId: user.id,
      quantity: 100,
      status: OrderStatusEnum.FILLED,
      priceOfAsset: 10,
      type: OrderTypeEnum.MARKET,
      asset: strategy.targetAsset,
      strategyId: strategy.id,
      portfolioId: portfolio._id,
      side: BuyOrSellEnum.BUY,
      deployment: DeploymentEnum.PAPER,
    });
    await portfolio.updatePositions(order);

    const conditionObj = new PositionPercentChangeCondition({
      targetAssets: [new Stock("DRIV")],
      percentChange: 50,
      comparator: Comparator.LESS_THAN_OR_EQUAL_TO,
    });
    strategy.addBuyingCondition(conditionObj);
    await strategy.save();

    const stratFromDb = await Strategy.findByName("Buy Driv Option", user.id);
    const conditions = ConditionFactory.createFromArray(
      stratFromDb.buyingConditions
    );
    const condition = conditions[0];

    const priceMap: PriceMap = new PriceMap();
    // bought for $10/conract
    let isTrue: boolean;

    priceMap.set(strategy.targetAsset.symbol, {
      bid: 10,
      mid: 10,
      ask: 10,
      open: 10,
      high: 10,
      low: 10,
      close: 10,
    });
    isTrue = await condition.isTrue({
      strategy,
      brokerage: null,
      priceMap,
      portfolio,
      currentTime: new Date(),
    });
    expect(isTrue).toEqual(true);

    priceMap.set(strategy.targetAsset.symbol, {
      bid: 11,
      mid: 11,
      ask: 11,
      open: 11,
      high: 11,
      low: 11,
      close: 11,
    });
    isTrue = await condition.isTrue({
      strategy,
      brokerage: null,
      priceMap,
      portfolio,
      currentTime: new Date(),
    });
    expect(isTrue).toEqual(true);

    priceMap.set(strategy.targetAsset.symbol, {
      bid: 12,
      mid: 12,
      ask: 12,
      open: 12,
      high: 12,
      low: 12,
      close: 12,
    });
    isTrue = await condition.isTrue({
      strategy,
      brokerage: null,
      priceMap,
      portfolio,
      currentTime: new Date(),
    });
    expect(isTrue).toEqual(true);

    priceMap.set(strategy.targetAsset.symbol, {
      bid: 20,
      mid: 20,
      ask: 20,
      open: 20,
      high: 20,
      low: 20,
      close: 20,
    });
    isTrue = await condition.isTrue({
      strategy,
      brokerage: null,
      priceMap,
      portfolio,
      currentTime: new Date(),
    });
    expect(isTrue).toEqual(false);

    priceMap.set(strategy.targetAsset.symbol, {
      bid: 8,
      mid: 8,
      ask: 8,
      open: 8,
      high: 8,
      low: 8,
      close: 8,
    });
    isTrue = await condition.isTrue({
      strategy,
      brokerage: null,
      priceMap,
      portfolio,
      currentTime: new Date(),
    });
    expect(isTrue).toEqual(true);

    priceMap.set(strategy.targetAsset.symbol, {
      bid: 1,
      mid: 1,
      ask: 1,
      open: 1,
      high: 1,
      low: 1,
      close: 1,
    });
    isTrue = await condition.isTrue({
      strategy,
      brokerage: null,
      priceMap,
      portfolio,
      currentTime: new Date(),
    });
    expect(isTrue).toEqual(true);
  });

  test("Can create PriceCondition from Factory", async () => {
    const conditionObj = new PriceCondition({
      targetPrice: 560,
      comparator: Comparator.GREATER_THAN_OR_EQUAL_TO,
    });
    const condition = ConditionFactory.create(conditionObj);
    let isTrue: boolean;
    let priceMap: PriceMap = new PriceMap();
    let portfolio = await Portfolio.findByStrategy(strategy, user.id);

    priceMap.set(strategy.targetAsset.name, {
      bid: 580,
      mid: 580,
      ask: 580,
      high: 580,
      low: 580,
    });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      priceMap: priceMap,
      portfolio,
      currentTime: new Date(),
    });
    expect(isTrue).toEqual(true);

    priceMap.set(strategy.targetAsset.name, {
      bid: 550,
      mid: 550,
      ask: 550,
      high: 550,
      low: 550,
    });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      priceMap: priceMap,
      portfolio,
      currentTime: new Date(),
    });
    expect(isTrue).toEqual(false);
  });

  test("Test MovingAveragePriceCondition with factory", async () => {
    // must be less than the mean open to return true
    const assetName = strategy.targetAsset.name;
    let condition = new MovingAveragePriceCondition({
      comparator: Comparator.GREATER_THAN,
      standardDeviation: 0,
      duration: new Duration(5, TimeIntervalEnum.DAY),
      ohlc: OhlcEnum.CLOSE,
      statisticalMethod: StatisticsEnum.LOW,
    });
    strategy.addBuyingCondition(condition);
    await strategy.save();
    const strategies = await Strategy.find();
    let portfolio = await Portfolio.findByStrategy(strategy, user.id);

    condition = ConditionFactory.create(
      strategies[0].buyingConditions[0]
    ) as MovingAveragePriceCondition;
    const brokerage = new TestBrokerage({
      name: BrokerageEnum.TEST,
      authDetails: null,
    });
    let isTrue: boolean;
    let priceMap = new PriceMap();

    // close should be greater than or equal to 7 (the low close price)
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
      priceMap: priceMap,
      portfolio,
      currentTime: new Date(),
    });
    expect(isTrue).toEqual(true);

    // close should be greater than or equal to 7 (the low close price)
    priceMap.set(assetName, { bid: 8, mid: 8, ask: 8, high: 8, low: 8 });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: brokerage,
      priceMap: priceMap,
      portfolio,
      currentTime: new Date(),
    });
    expect(isTrue).toEqual(true);

    // close should be greater than or equal to 7 (the low close price)
    priceMap.set(assetName, { bid: 6, mid: 6, ask: 6, high: 6, low: 6 });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: brokerage,
      priceMap: priceMap,
      portfolio,
      currentTime: new Date(),
    });
    expect(isTrue).toEqual(false);
  });

  test("Test if you can create an AndCondition from factory", async () => {
    const condition1 = new PriceCondition({
      targetPrice: 100,
      comparator: Comparator.LESS_THAN,
    });
    const condition2 = new PriceCondition({
      targetPrice: 50,
      comparator: Comparator.LESS_THAN,
    });
    const condition3 = new PriceCondition({
      targetPrice: 20,
      comparator: Comparator.GREATER_THAN_OR_EQUAL_TO,
    });
    const conditionObj = new AndCondition();
    await conditionObj.addAll([condition1, condition2, condition3]);
    const condition = ConditionFactory.create(conditionObj);
    let portfolio = await Portfolio.findByStrategy(strategy, user.id);

    let isTrue: boolean;
    let priceMap: PriceMap = new PriceMap();
    priceMap.set(strategy.targetAsset.name, {
      bid: 10,
      mid: 10,
      ask: 10,
      high: 10,
      low: 10,
    });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      priceMap: priceMap,
      portfolio,
      currentTime: new Date(),
    });
    expect(isTrue).toEqual(false);

    priceMap.set(strategy.targetAsset.name, {
      bid: 100,
      mid: 100,
      ask: 100,
      high: 100,
      low: 100,
    });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      priceMap: priceMap,
      portfolio,
      currentTime: new Date(),
    });
    expect(isTrue).toEqual(false);

    priceMap.set(strategy.targetAsset.name, {
      bid: 100,
      mid: 100,
      ask: 100,
      high: 100,
      low: 100,
    });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      priceMap: priceMap,
      portfolio,
      currentTime: new Date(),
    });
    expect(isTrue).toEqual(false);

    priceMap.set(strategy.targetAsset.name, {
      bid: 50,
      mid: 50,
      ask: 50,
      high: 50,
      low: 50,
    });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      priceMap: priceMap,
      portfolio,
      currentTime: new Date(),
    });
    expect(isTrue).toEqual(false);

    priceMap.set(strategy.targetAsset.name, {
      bid: 0,
      mid: 0,
      ask: 0,
      high: 0,
      low: 0,
    });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      priceMap: priceMap,
      portfolio,
      currentTime: new Date(),
    });
    expect(isTrue).toEqual(false);

    priceMap.set(strategy.targetAsset.name, {
      bid: 4,
      mid: 4,
      ask: 4,
      high: 4,
      low: 4,
    });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      priceMap: priceMap,
      portfolio,
      currentTime: new Date(),
    });
    expect(isTrue).toEqual(false);

    priceMap.set(strategy.targetAsset.name, {
      bid: 45,
      mid: 45,
      ask: 45,
      high: 45,
      low: 45,
    });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      priceMap: priceMap,
      portfolio,
      currentTime: new Date(),
    });
    expect(isTrue).toEqual(true);
  });

  test("Test if trying to create a non-existing condition will throw an error", async () => {
    const conditionObj = new PriceCondition({
      targetPrice: 100,
      comparator: Comparator.LESS_THAN,
    });
    conditionObj.type = "Invalid ConditionName" as ConditionEnum;
    try {
      ConditionFactory.create(conditionObj);
    } catch (e) {
      expect(e).not.toBeNull();
    }
  });
});
