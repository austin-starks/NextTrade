import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "@jest/globals";
import { AndCondition, SimplePriceCondition as PriceCondition } from "..";
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
var assetName: string;
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
  assetName = strategy.targetAsset.name;
  portfolio = new Portfolio({
    userId: user.id,
    name: "First automated trading strategy",
    initialValue: 10000,
  });
  portfolio.addStrategy(strategy);
});

afterEach(async () => await dbHandler.clearDatabase());

afterAll(async () => {
  await dbHandler.closeDatabase();
});

describe("And Condition tests", () => {
  test("Test if you can combine two conditions", async () => {
    const condition1 = new PriceCondition({
      targetPrice: 50,
      comparator: Comparator.LESS_THAN,
    });
    const condition2 = new PriceCondition({
      targetPrice: 40,
      comparator: Comparator.GREATER_THAN_OR_EQUAL_TO,
    });

    const condition = new AndCondition();
    await condition.addAll([condition1, condition2]);
    let isTrue: boolean;
    let priceMap = new PriceMap();
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
      priceMap: priceMap,
      portfolio: portfolio,
    });
    expect(isTrue).toEqual(false);

    priceMap.set(assetName, {
      bid: 39.9,
      mid: 39.9,
      ask: 39.9,
      high: 39.9,
      low: 39.9,
    });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      currentTime: new Date(),
      priceMap: priceMap,
      portfolio: portfolio,
    });
    expect(isTrue).toEqual(false);

    priceMap.set(assetName, {
      bid: 40,
      mid: 40,
      ask: 40,
      high: 40,
      low: 40,
    });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      currentTime: new Date(),
      priceMap: priceMap,
      portfolio: portfolio,
    });
    expect(isTrue).toEqual(true);

    priceMap.set(assetName, {
      bid: 41,
      mid: 41,
      ask: 41,
      high: 41,
      low: 41,
    });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      currentTime: new Date(),
      priceMap: priceMap,
      portfolio: portfolio,
    });
    expect(isTrue).toEqual(true);

    priceMap.set(assetName, {
      bid: 50,
      mid: 50,
      ask: 50,
      high: 50,
      low: 50,
    });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      currentTime: new Date(),
      priceMap: priceMap,
      portfolio: portfolio,
    });
    expect(isTrue).toEqual(false);

    priceMap.set(assetName, {
      bid: 90,
      mid: 90,
      ask: 90,
      high: 90,
      low: 90,
    });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      currentTime: new Date(),
      priceMap: priceMap,
      portfolio: portfolio,
    });
    expect(isTrue).toEqual(false);
  });

  test("Test if you can combine three conditions to make a new condition", async () => {
    const condition1 = new PriceCondition({
      targetPrice: 50,
      comparator: Comparator.LESS_THAN,
    });
    const condition2 = new PriceCondition({
      targetPrice: 40,
      comparator: Comparator.GREATER_THAN_OR_EQUAL_TO,
    });
    const condition3 = new PriceCondition({
      targetPrice: 10,
      comparator: Comparator.GREATER_THAN_OR_EQUAL_TO,
    });
    const condition = new AndCondition();
    await condition.addAll([condition1, condition2, condition3]);

    let isTrue: boolean;
    let priceMap = new PriceMap();
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
      priceMap: priceMap,
      portfolio: portfolio,
    });
    expect(isTrue).toEqual(false);

    priceMap.set(assetName, {
      bid: 100,
      mid: 100,
      ask: 100,
      high: 100,
      low: 100,
    });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      currentTime: new Date(),
      priceMap: priceMap,
      portfolio: portfolio,
    });
    expect(isTrue).toEqual(false);

    priceMap.set(assetName, {
      bid: 50,
      mid: 50,
      ask: 50,
      high: 50,
      low: 50,
    });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      currentTime: new Date(),
      priceMap: priceMap,
      portfolio: portfolio,
    });
    expect(isTrue).toEqual(false);

    priceMap.set(assetName, { bid: 0, mid: 0, ask: 0, high: 0, low: 0 });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      currentTime: new Date(),
      priceMap: priceMap,
      portfolio: portfolio,
    });
    expect(isTrue).toEqual(false);

    priceMap.set(assetName, { bid: 8, mid: 8, ask: 8, high: 8, low: 8 });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      currentTime: new Date(),
      priceMap: priceMap,
      portfolio: portfolio,
    });
    expect(isTrue).toEqual(false);

    priceMap.set(assetName, {
      bid: 40,
      mid: 40,
      ask: 40,
      high: 40,
      low: 40,
    });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      currentTime: new Date(),
      priceMap: priceMap,
      portfolio: portfolio,
    });
    expect(isTrue).toEqual(true);

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
      priceMap: priceMap,
      portfolio: portfolio,
    });
    expect(isTrue).toEqual(false);

    priceMap.set(assetName, {
      bid: 45,
      mid: 45,
      ask: 45,
      high: 45,
      low: 45,
    });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      currentTime: new Date(),
      priceMap: priceMap,
      portfolio: portfolio,
    });
    expect(isTrue).toEqual(true);
  });

  test("Test if you can combine three conditions to make impossible condition", async () => {
    const condition1 = new PriceCondition({
      targetPrice: 50,
      comparator: Comparator.LESS_THAN,
    });
    const condition2 = new PriceCondition({
      targetPrice: 40,
      comparator: Comparator.GREATER_THAN_OR_EQUAL_TO,
    });
    const condition3 = new PriceCondition({
      targetPrice: 100,
      comparator: Comparator.GREATER_THAN_OR_EQUAL_TO,
    });
    const condition = new AndCondition();
    await condition.addAll([condition1, condition2, condition3]);
    let isTrue: boolean;
    let priceMap = new PriceMap();

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
      priceMap: priceMap,
      portfolio: portfolio,
    });
    expect(isTrue).toEqual(false);

    priceMap.set(assetName, {
      bid: 100,
      mid: 100,
      ask: 100,
      high: 100,
      low: 100,
    });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      currentTime: new Date(),
      priceMap: priceMap,
      portfolio: portfolio,
    });
    expect(isTrue).toEqual(false);

    priceMap.set(assetName, {
      bid: 50,
      mid: 50,
      ask: 50,
      high: 50,
      low: 50,
    });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      currentTime: new Date(),
      priceMap: priceMap,
      portfolio: portfolio,
    });
    expect(isTrue).toEqual(false);

    priceMap.set(assetName, { bid: 0, mid: 0, ask: 0, high: 0, low: 0 });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      currentTime: new Date(),
      priceMap: priceMap,
      portfolio: portfolio,
    });
    expect(isTrue).toEqual(false);

    priceMap.set(assetName, {
      bid: 40,
      mid: 40,
      ask: 40,
      high: 40,
      low: 40,
    });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      currentTime: new Date(),
      priceMap: priceMap,
      portfolio: portfolio,
    });
    expect(isTrue).toEqual(false);

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
      priceMap: priceMap,
      portfolio: portfolio,
    });
    expect(isTrue).toEqual(false);
  });

  test("Test if you can create an AndCondition from scratch", async () => {
    const condition1 = new PriceCondition({
      targetPrice: 10,
      comparator: Comparator.LESS_THAN,
    });
    const condition2 = new PriceCondition({
      targetPrice: 0,
      comparator: Comparator.GREATER_THAN,
    });
    const condition3 = new PriceCondition({
      targetPrice: 8,
      comparator: Comparator.GREATER_THAN_OR_EQUAL_TO,
    });
    const condition = new AndCondition();
    await condition.addAll([condition1, condition2, condition3]);
    let isTrue: boolean;
    let priceMap = new PriceMap();
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
      priceMap: priceMap,
      portfolio: portfolio,
    });
    expect(isTrue).toEqual(false);

    priceMap.set(assetName, {
      bid: 100,
      mid: 100,
      ask: 100,
      high: 100,
      low: 100,
    });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      currentTime: new Date(),
      priceMap: priceMap,
      portfolio: portfolio,
    });
    expect(isTrue).toEqual(false);

    priceMap.set(assetName, {
      bid: 50,
      mid: 50,
      ask: 50,
      high: 50,
      low: 50,
    });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      currentTime: new Date(),
      priceMap: priceMap,
      portfolio: portfolio,
    });
    expect(isTrue).toEqual(false);

    priceMap.set(assetName, { bid: 0, mid: 0, ask: 0, high: 0, low: 0 });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      currentTime: new Date(),
      priceMap: priceMap,
      portfolio: portfolio,
    });
    expect(isTrue).toEqual(false);

    priceMap.set(assetName, { bid: 4, mid: 4, ask: 4, high: 4, low: 4 });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      currentTime: new Date(),
      priceMap: priceMap,
      portfolio: portfolio,
    });
    expect(isTrue).toEqual(false);

    priceMap.set(assetName, { bid: 9, mid: 9, ask: 9, high: 9, low: 9 });
    isTrue = await condition.isTrue({
      strategy: strategy,
      brokerage: null,
      currentTime: new Date(),
      priceMap: priceMap,
      portfolio: portfolio,
    });
    expect(isTrue).toEqual(true);
  });
});
