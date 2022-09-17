import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "@jest/globals";
import { HavePositionCondition } from "..";
import DbHandler from "../../../services/db";
import {
  AllocationEnum,
  BrokerageEnum,
  BuyOrSellEnum,
  Comparator,
  DeploymentEnum,
  OrderStatusEnum,
  OrderTypeEnum,
} from "../../../utils/enums";
import { Allocation, PurchaseAndSaleAllocation } from "../../allocation";
import { Stock } from "../../asset";
import Order from "../../order";
import Portfolio from "../../portfolio";
import PriceMap from "../../priceMap";
import Strategy, { IStrategy } from "../../strategy";
import User from "../../user";

const dbHandler: DbHandler = new DbHandler("test");
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
});

afterEach(async () => await dbHandler.clearDatabase());

afterAll(async () => {
  await dbHandler.closeDatabase();
});

describe("Testing havePosition condition", () => {
  test("Testing condition is true when you have the exact amount of target position.", async () => {
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
      targetAsset: new Stock("DRIV"),
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

    const priceMap: PriceMap = new PriceMap();
    let priceobj = {
      bid: 14,
      mid: 14,
      ask: 14,
      open: 14,
      high: 14,
      low: 14,
      close: 14,
    };
    priceMap.set("DRIV", priceobj);
    let isTrue: boolean;
    let conditionFalse = new HavePositionCondition({
      allocation: new Allocation({
        type: AllocationEnum.NUM_ASSETS,
        amount: 50,
      }),
      targetAssets: [strategy.targetAsset],
      comparator: Comparator.EQUAL_TO,
    });
    isTrue = await conditionFalse.isTrue({
      strategy: strategy,
      brokerage: null,
      priceMap: priceMap,
      currentTime: new Date(),

      portfolio,
    });
    expect(isTrue).toEqual(false);
    let conditionFalse2 = new HavePositionCondition({
      allocation: new Allocation({
        type: AllocationEnum.NUM_ASSETS,
        amount: 150,
      }),
      targetAssets: [strategy.targetAsset],
      comparator: Comparator.EQUAL_TO,
    });
    isTrue = await conditionFalse2.isTrue({
      strategy: strategy,
      brokerage: null,
      priceMap: priceMap,
      currentTime: new Date(),

      portfolio,
    });
    expect(isTrue).toEqual(false);
    let conditionTrue = new HavePositionCondition({
      allocation: new Allocation({
        type: AllocationEnum.NUM_ASSETS,
        amount: 100,
      }),
      targetAssets: [strategy.targetAsset],
      comparator: Comparator.EQUAL_TO,
    });
    isTrue = await conditionTrue.isTrue({
      strategy: strategy,
      brokerage: null,
      priceMap: priceMap,
      currentTime: new Date(),

      portfolio,
    });
    expect(isTrue).toEqual(true);
  });

  test("Testing condition is true when you have less than amount of target position.", async () => {
    const p = new Portfolio({
      userId: user.id,
      name: "strategy collection",
      initialValue: 100000,
    });
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
    p.addStrategy(strategy);

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
      portfolioId: p._id,
      side: BuyOrSellEnum.BUY,
    });
    await p.updatePositions(order);

    const priceMap: PriceMap = new PriceMap();
    priceMap.set("DRIV", {
      bid: 14,
      mid: 14,
      ask: 14,
      open: 14,
      high: 14,
      low: 14,
      close: 14,
    });

    let isTrue: boolean;
    let condition = new HavePositionCondition({
      allocation: new Allocation({
        type: AllocationEnum.DOLLARS,
        amount: 800,
      }),
      targetAssets: [strategy.targetAsset],
      comparator: Comparator.LESS_THAN,
    });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      priceMap: priceMap,
      currentTime: new Date(),

      portfolio: p,
    });
    expect(isTrue).toEqual(false);

    priceMap.set("DRIV", {
      bid: 10,
      mid: 10,
      ask: 10,
      open: 10,
      high: 10,
      low: 10,
      close: 10,
    });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      priceMap: priceMap,
      currentTime: new Date(),

      portfolio: p,
    });
    expect(isTrue).toEqual(false);

    priceMap.set("DRIV", {
      bid: 8,
      mid: 8,
      ask: 8,
      open: 8,
      high: 8,
      low: 8,
      close: 8,
    });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      priceMap: priceMap,
      currentTime: new Date(),

      portfolio: p,
    });
    expect(isTrue).toEqual(false);

    priceMap.set("DRIV", {
      bid: 7.8,
      mid: 7.8,
      ask: 7.8,
      open: 7.8,
      high: 7.8,
      low: 7.8,
      close: 7.8,
    });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      priceMap: priceMap,
      currentTime: new Date(),

      portfolio: p,
    });
    expect(isTrue).toEqual(true);
  });

  test("Testing condition is true when you have less than amount of target position.", async () => {
    const strategyObj: IStrategy = {
      name: "Buy Driv Option",
      userId: user.id,
      targetAsset: new Stock("DRIV"),
      buyAmount: new PurchaseAndSaleAllocation({
        amount: 100,
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
      targetAsset: new Stock("DRIV"),
    });
    const portfolio = new Portfolio({
      userId: user.id,
      name: "strategy collection",
      initialValue: 2000,
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
    const priceMap: PriceMap = new PriceMap();
    priceMap.set("DRIV", {
      bid: 10,
      mid: 10,
      ask: 10,
      open: 10,
      high: 10,
      low: 10,
      close: 10,
    });
    let isTrue: boolean;
    let conditionFalse = new HavePositionCondition({
      allocation: new Allocation({
        type: AllocationEnum.PERCENT_OF_BUYING_POWER,
        amount: 99,
      }),
      targetAssets: [strategy.targetAsset],
      comparator: Comparator.LESS_THAN_OR_EQUAL_TO,
    });
    isTrue = await conditionFalse.isTrue({
      strategy: strategy,
      brokerage: null,
      priceMap: priceMap,
      currentTime: new Date(),

      portfolio,
    });
    expect(isTrue).toEqual(false);
    let conditionTrue = new HavePositionCondition({
      allocation: new Allocation({
        type: AllocationEnum.PERCENT_OF_BUYING_POWER,
        amount: 100,
      }),
      targetAssets: [strategy.targetAsset],
      comparator: Comparator.LESS_THAN_OR_EQUAL_TO,
    });
    isTrue = await conditionTrue.isTrue({
      strategy: strategy,
      brokerage: null,
      priceMap: priceMap,
      currentTime: new Date(),
      portfolio,
    });
    expect(isTrue).toEqual(true);
  });
});
