import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "@jest/globals";
import { SimplePriceCondition as PriceCondition } from "..";
import DbHandler from "../../../services/db";
import {
  AllocationEnum,
  BrokerageEnum,
  Comparator,
} from "../../../utils/enums";
import { PurchaseAndSaleAllocation } from "../../allocation";
import { Stock } from "../../asset";
import Portfolio from "../../portfolio";
import PriceMap from "../../priceMap";
import Strategy, { IStrategy } from "../../strategy";
import User from "../../user";

const dbHandler: DbHandler = new DbHandler("test");
var strategy: Strategy;
var portfolio: Portfolio;
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
    buyingConditions: [],
    sellingConditions: [],
    buyAmount: new PurchaseAndSaleAllocation({
      amount: 40,
      type: AllocationEnum.PERCENT_OF_BUYING_POWER,
    }),
    sellAmount: new PurchaseAndSaleAllocation({
      amount: 20,
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

describe("Price Condition tests", () => {
  test("isTrue returns true if current price is less than target and comparator is less than", async () => {
    let priceMap: PriceMap = new PriceMap();
    priceMap.set(strategy.targetAsset.name, {
      bid: 10,
      mid: 10,
      ask: 10,
      high: 10,
      low: 10,
    });
    const condition = new PriceCondition({
      targetPrice: 50,
      comparator: Comparator.LESS_THAN,
    });

    const isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      priceMap: priceMap,
      currentTime: new Date(),
      portfolio,
    });
    expect(isTrue).toEqual(true);
  });

  test("isTrue returns false if current price is greater than target and comparator is less than", async () => {
    const condition = new PriceCondition({
      targetPrice: 50,
      comparator: Comparator.LESS_THAN,
    });
    let priceMap: PriceMap = new PriceMap();
    priceMap.set(strategy.targetAsset.name, {
      bid: 100,
      mid: 100,
      ask: 100,
      high: 100,
      low: 100,
    });

    const isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      priceMap: priceMap,
      currentTime: new Date(),
      portfolio,
    });

    expect(isTrue).toEqual(false);
  });

  test("isTrue returns true if current price is greater than target and comparator is greater than", async () => {
    const condition = new PriceCondition({
      targetPrice: 50,
      comparator: Comparator.GREATER_THAN,
    });
    let priceMap: PriceMap = new PriceMap();
    priceMap.set(strategy.targetAsset.name, {
      bid: 100,
      mid: 100,
      ask: 100,
      high: 100,
      low: 100,
    });

    const isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      priceMap: priceMap,
      currentTime: new Date(),
      portfolio,
    });
    expect(isTrue).toEqual(true);
  });

  test("isTrue returns false if current price is less than target and comparator is greater than", async () => {
    const condition = new PriceCondition({
      targetPrice: 50,
      comparator: Comparator.GREATER_THAN,
    });
    let priceMap: PriceMap = new PriceMap();
    priceMap.set(strategy.targetAsset.name, {
      bid: 10,
      mid: 10,
      ask: 10,
      high: 10,
      low: 10,
    });

    const isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      priceMap: priceMap,
      currentTime: new Date(),
      portfolio,
    });
    expect(isTrue).toEqual(false);
  });

  test("isTrue returns true if current price is equal to target and comparator is less than or equal to", async () => {
    const condition = new PriceCondition({
      targetPrice: 50,
      comparator: Comparator.LESS_THAN_OR_EQUAL_TO,
    });
    let priceMap: PriceMap = new PriceMap();
    priceMap.set(strategy.targetAsset.name, {
      bid: 50,
      mid: 50,
      ask: 50,
      high: 50,
      low: 50,
    });

    const isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      priceMap: priceMap,
      currentTime: new Date(),
      portfolio,
    });
    expect(isTrue).toEqual(true);
  });

  test("isTrue returns true if current price is equal to target and comparator is greater than or equal to", async () => {
    const condition = new PriceCondition({
      targetPrice: 560,
      comparator: Comparator.GREATER_THAN_OR_EQUAL_TO,
    });
    let priceMap: PriceMap = new PriceMap();
    priceMap.set(strategy.targetAsset.name, {
      bid: 560,
      mid: 560,
      ask: 560,
      high: 560,
      low: 560,
    });

    const isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      priceMap: priceMap,
      currentTime: new Date(),
      portfolio,
    });
    expect(isTrue).toEqual(true);
  });
});
