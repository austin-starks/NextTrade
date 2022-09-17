import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "@jest/globals";
import { PortfolioIsProfitableCondition } from "..";
import DbHandler from "../../../services/db";
import {
  AllocationEnum,
  BrokerageEnum,
  BuyOrSellEnum,
  DeploymentEnum,
  OrderStatusEnum,
  OrderTypeEnum,
} from "../../../utils/enums";
import { PurchaseAndSaleAllocation } from "../../allocation";
import { Stock } from "../../asset";
import Order from "../../order";
import Portfolio from "../../portfolio";
import PriceMap from "../../priceMap";
import Strategy, { IStrategy } from "../../strategy";
import User from "../../user";

const dbHandler: DbHandler = new DbHandler("test");
var portfolio: Portfolio;
var user: User;

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
  portfolio = new Portfolio({
    userId: user.id,
    name: "First automated trading strategy",
    initialValue: 10000,
  });
});

beforeAll(async () => {
  await dbHandler.connect();
});

afterEach(async () => await dbHandler.clearDatabase());

afterAll(async () => {
  await dbHandler.closeDatabase();
});

describe("Testing PortfolioIsProfitableCondition", () => {
  test("Strategy is not profitable when first creating it.", async () => {
    const strategyObj: IStrategy = {
      name: "Buy Driv Option",
      userId: user.id,
      targetAsset: new Stock("DRIV"),
      buyAmount: new PurchaseAndSaleAllocation({
        amount: 40,
        type: AllocationEnum.PERCENT_OF_BUYING_POWER,
      }),
      sellAmount: new PurchaseAndSaleAllocation({
        amount: 20,
        type: AllocationEnum.PERCENT_OF_CURRENT_POSITIONS,
      }),
    };
    let strategy = new Strategy(strategyObj);
    let assetName = strategy.targetAsset.name;

    const condition = new PortfolioIsProfitableCondition();
    let isTrue: boolean;
    let priceMap: PriceMap = new PriceMap();
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
      currentTime: new Date(),
      portfolio,
      priceMap: priceMap,
    });
    expect(isTrue).toEqual(false);
  });

  test("Test PortfolioIsProfitableCondition after filling an order.", async () => {
    const strategyObj: IStrategy = {
      name: "Buy Driv Option",
      userId: user.id,
      targetAsset: new Stock("DRIV"),
      buyAmount: new PurchaseAndSaleAllocation({
        amount: 40,
        type: AllocationEnum.PERCENT_OF_BUYING_POWER,
      }),
      sellAmount: new PurchaseAndSaleAllocation({
        amount: 20,
        type: AllocationEnum.PERCENT_OF_CURRENT_POSITIONS,
      }),
    };
    let strategy = new Strategy(strategyObj);
    let assetName = strategy.targetAsset.name;
    const order = new Order({
      brokerageId: "ehu7y654565432wsdfg",
      userId: user.id,
      deployment: DeploymentEnum.LIVE,
      quantity: 100,
      status: OrderStatusEnum.FILLED,
      priceOfAsset: 10,
      type: OrderTypeEnum.MARKET,
      asset: strategy.targetAsset,
      strategyId: strategy.id,
      portfolioId: portfolio._id,
      side: BuyOrSellEnum.BUY,
    });
    await portfolio.updatePositions(order);

    const condition = new PortfolioIsProfitableCondition();
    let isTrue: boolean;
    let priceMap: PriceMap = new PriceMap();
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
      currentTime: new Date(),
      portfolio,
      priceMap: priceMap,
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
      currentTime: new Date(),
      portfolio,
      priceMap: priceMap,
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
      currentTime: new Date(),
      portfolio,
      priceMap: priceMap,
    });
    expect(isTrue).toEqual(true);
  });

  test("Test PortfolioIsProfitableCondition with percent profitable", async () => {
    const strategyObj: IStrategy = {
      name: "Buy Driv Option",
      userId: user.id,
      targetAsset: new Stock("DRIV"),
      buyAmount: new PurchaseAndSaleAllocation({
        amount: 40,
        type: AllocationEnum.PERCENT_OF_BUYING_POWER,
      }),
      sellAmount: new PurchaseAndSaleAllocation({
        amount: 20,
        type: AllocationEnum.PERCENT_OF_CURRENT_POSITIONS,
      }),
    };
    let strategy = new Strategy(strategyObj);
    let assetName = strategy.targetAsset.name;
    const order = new Order({
      brokerageId: "ehu7y654565432wsdfg",
      userId: user.id,
      deployment: DeploymentEnum.LIVE,
      quantity: 100,
      status: OrderStatusEnum.FILLED,
      priceOfAsset: 10,
      type: OrderTypeEnum.MARKET,
      asset: strategy.targetAsset,
      strategyId: strategy.id,
      portfolioId: portfolio._id,
      side: BuyOrSellEnum.BUY,
    });
    await portfolio.updatePositions(order);

    const condition = new PortfolioIsProfitableCondition({ percentProfit: 10 });
    let isTrue: boolean;
    let priceMap: PriceMap = new PriceMap();
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
      currentTime: new Date(),
      portfolio,
      priceMap: priceMap,
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
      currentTime: new Date(),
      portfolio,
      priceMap: priceMap,
    });
    expect(isTrue).toEqual(false);

    // test if price of asset increases, but not enough
    // note: initialValue: 10000
    priceMap.set(assetName, {
      bid: 17.5,
      mid: 17.5,
      ask: 17.5,
      high: 17.5,
      low: 17.5,
    });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      currentTime: new Date(),
      portfolio,
      priceMap: priceMap,
    });
    expect(isTrue).toEqual(false);

    // test if price of asset increases, but not enough
    // note: initialValue: 10000
    priceMap.set(assetName, {
      bid: 20,
      mid: 20,
      ask: 20,
      high: 20,
      low: 20,
    });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      currentTime: new Date(),
      portfolio,
      priceMap: priceMap,
    });
    expect(isTrue).toEqual(false);

    // test if price of asset increases enough
    // note: initialValue: 10000
    priceMap.set(assetName, {
      bid: 21,
      mid: 21,
      ask: 21,
      high: 21,
      low: 21,
    });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      currentTime: new Date(),
      portfolio,
      priceMap: priceMap,
    });
    expect(isTrue).toEqual(true);
  });

  test("Strategy is profitable if we specify negative percent profitable args", async () => {
    const strategyObj: IStrategy = {
      name: "Buy Driv Option",
      userId: user.id,
      targetAsset: new Stock("DRIV"),
      buyAmount: new PurchaseAndSaleAllocation({
        amount: 40,
        type: AllocationEnum.PERCENT_OF_BUYING_POWER,
      }),
      sellAmount: new PurchaseAndSaleAllocation({
        amount: 20,
        type: AllocationEnum.PERCENT_OF_CURRENT_POSITIONS,
      }),
    };
    let strategy = new Strategy(strategyObj);
    let assetName = strategy.targetAsset.name;
    const condition = new PortfolioIsProfitableCondition({
      percentProfit: -0.1,
    });

    let isTrue: boolean;
    let priceMap: PriceMap = new PriceMap();
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
      currentTime: new Date(),
      portfolio,
      priceMap: priceMap,
    });
    expect(isTrue).toEqual(true);
  });

  test("Test PortfolioIsProfitableCondition of an entire portfolio.", async () => {
    const strategyObj: IStrategy = {
      name: "Buy Driv Option",
      userId: user.id,
      targetAsset: new Stock("DRIV"),
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
    // need to save the strategy to DB to work properly
    await strategy.save();
    const strategy2 = await strategy.clone({
      name: "Cloned strategy",
      targetAsset: new Stock("SPY"),
    });
    const portfolio = new Portfolio({
      userId: user.id,
      name: "strategy collection",
      initialValue: 100000,
    });
    portfolio.addStrategies([strategy, strategy2]);
    await portfolio.save();
    const order = new Order({
      brokerageId: "ehu7y654565432wsdfg",
      userId: user.id,
      deployment: DeploymentEnum.LIVE,
      quantity: 100,
      status: OrderStatusEnum.FILLED,
      priceOfAsset: 10,
      type: OrderTypeEnum.MARKET,
      asset: strategy.targetAsset,
      strategyId: strategy.id,
      portfolioId: portfolio._id,
      side: BuyOrSellEnum.BUY,
    });
    await portfolio.updatePositions(order);
    const condition = new PortfolioIsProfitableCondition();
    let isTrue: boolean;
    let priceMap: PriceMap = new PriceMap();
    let assetName = strategy.targetAsset.name;

    // Testing using the other strategy in the portfolio
    priceMap.set(assetName, { bid: 9, mid: 9, ask: 9, high: 9, low: 9 });
    isTrue = await condition.isTrue({
      strategy: strategy2,
      brokerage: null,
      currentTime: new Date(),
      portfolio,
      priceMap: priceMap,
    });
    expect(isTrue).toEqual(false);

    priceMap.set(assetName, {
      bid: 10,
      mid: 10,
      ask: 10,
      high: 10,
      low: 10,
    });
    isTrue = await condition.isTrue({
      strategy: strategy2,
      brokerage: null,
      currentTime: new Date(),
      portfolio,
      priceMap: priceMap,
    });
    expect(isTrue).toEqual(false);

    priceMap.set(assetName, {
      bid: 11,
      mid: 11,
      ask: 11,
      high: 11,
      low: 11,
    });
    isTrue = await condition.isTrue({
      strategy: strategy2,
      brokerage: null,
      currentTime: new Date(),
      portfolio,
      priceMap: priceMap,
    });
    expect(isTrue).toEqual(true);

    const order2 = new Order({
      brokerageId: "ehu7y654565432wsdfg",
      userId: user.id,
      deployment: DeploymentEnum.LIVE,
      quantity: 100,
      status: OrderStatusEnum.FILLED,
      priceOfAsset: 12,
      type: OrderTypeEnum.MARKET,
      asset: strategy.targetAsset,
      strategyId: strategy.id,
      portfolioId: portfolio._id,
      side: BuyOrSellEnum.BUY,
    });
    await portfolio.updatePositions(order2);

    priceMap.set(assetName, {
      bid: 11,
      mid: 11,
      ask: 11,
      high: 11,
      low: 11,
    });
    isTrue = await condition.isTrue({
      strategy: strategy2,
      brokerage: null,
      currentTime: new Date(),
      portfolio,
      priceMap: priceMap,
    });
    expect(isTrue).toEqual(false);

    priceMap.set(assetName, {
      bid: 12,
      mid: 12,
      ask: 12,
      high: 12,
      low: 12,
    });
    isTrue = await condition.isTrue({
      strategy: strategy2,
      brokerage: null,
      currentTime: new Date(),
      portfolio,
      priceMap: priceMap,
    });
    expect(isTrue).toEqual(true);
  });
});
