import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "@jest/globals";
import { PositionPercentChangeCondition } from "..";
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
import { PurchaseAndSaleAllocation } from "../../allocation";
import { Option, Stock } from "../../asset";
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
  const strategyObj: IStrategy = {
    name: "Buy Driv",
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
  const strategy = new Strategy(strategyObj);
  await strategy.save();
  let option = new Option("DRIV");
  option.symbol = "DRIV090224C0001100";
  const strategy2 = await strategy.clone({
    name: "Cloned strategy",
    targetAsset: option,
  });
  const portfolio = new Portfolio({
    userId: user.id,
    name: "strategy collection",
    initialValue: 1000000,
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
  const order2 = new Order({
    brokerageId: "ehu7y654565432wsdfg",
    userId: user.id,
    deployment: DeploymentEnum.LIVE,
    quantity: 1,
    status: OrderStatusEnum.FILLED,
    priceOfAsset: 1000,
    type: OrderTypeEnum.MARKET,
    asset: strategy2.targetAsset,
    strategyId: strategy2.id,
    portfolioId: portfolio._id,
    side: BuyOrSellEnum.BUY,
  });
  await portfolio.updatePositions(order2);
});

afterEach(async () => await dbHandler.clearDatabase());

afterAll(async () => {
  await dbHandler.closeDatabase();
});

describe("Testing havePosition condition", () => {
  test("Testing condition is true when the stock is down 20% or more", async () => {
    const strategies = await Strategy.find();
    const strategy = strategies[0];
    let portfolio = await Portfolio.findByStrategy(strategy, user.id);

    const priceMap: PriceMap = new PriceMap();
    // bought for $10/share
    const condition = new PositionPercentChangeCondition({
      targetAssets: [new Stock("DRIV")],
      percentChange: -20,
      comparator: Comparator.LESS_THAN_OR_EQUAL_TO,
    });
    let isTrue: boolean;
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
      portfolio,
      strategy,
      currentTime: new Date(),
      brokerage: null,
      priceMap,
    });
    expect(isTrue).toEqual(false);

    priceMap.set("DRIV", {
      bid: 11,
      mid: 11,
      ask: 11,
      open: 11,
      high: 11,
      low: 11,
      close: 11,
    });
    isTrue = await condition.isTrue({
      portfolio,
      strategy,
      currentTime: new Date(),
      brokerage: null,
      priceMap,
    });
    expect(isTrue).toEqual(false);

    priceMap.set("DRIV", {
      bid: 12,
      mid: 12,
      ask: 12,
      open: 12,
      high: 12,
      low: 12,
      close: 12,
    });
    isTrue = await condition.isTrue({
      portfolio,
      strategy,
      currentTime: new Date(),
      brokerage: null,
      priceMap,
    });
    expect(isTrue).toEqual(false);

    priceMap.set("DRIV", {
      bid: 20,
      mid: 20,
      ask: 20,
      open: 20,
      high: 20,
      low: 20,
      close: 20,
    });
    isTrue = await condition.isTrue({
      portfolio,
      strategy,
      currentTime: new Date(),
      brokerage: null,
      priceMap,
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
      portfolio,
      strategy,
      currentTime: new Date(),
      brokerage: null,
      priceMap,
    });
    expect(isTrue).toEqual(true);

    priceMap.set("DRIV", {
      bid: 1,
      mid: 1,
      ask: 1,
      open: 1,
      high: 1,
      low: 1,
      close: 1,
    });
    isTrue = await condition.isTrue({
      portfolio,
      strategy,
      currentTime: new Date(),
      brokerage: null,
      priceMap,
    });
    expect(isTrue).toEqual(true);
  });

  test("Testing condition is true when the stock is up more than 20%", async () => {
    const strategies = await Strategy.find();
    const strategy = strategies[0];
    let portfolio = await Portfolio.findByStrategy(strategy, user.id);

    const priceMap: PriceMap = new PriceMap();
    // bought for $10/share
    const condition = new PositionPercentChangeCondition({
      targetAssets: [new Stock("DRIV")],
      percentChange: 20,
      comparator: Comparator.GREATER_THAN,
    });
    let isTrue: boolean;
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
      portfolio,
      strategy,
      currentTime: new Date(),
      brokerage: null,
      priceMap,
    });
    expect(isTrue).toEqual(false);

    priceMap.set("DRIV", {
      bid: 11,
      mid: 11,
      ask: 11,
      open: 11,
      high: 11,
      low: 11,
      close: 11,
    });
    isTrue = await condition.isTrue({
      portfolio,
      strategy,
      currentTime: new Date(),
      brokerage: null,
      priceMap,
    });
    expect(isTrue).toEqual(false);

    priceMap.set("DRIV", {
      bid: 12,
      mid: 12,
      ask: 12,
      open: 12,
      high: 12,
      low: 12,
      close: 12,
    });
    isTrue = await condition.isTrue({
      portfolio,
      strategy,
      currentTime: new Date(),
      brokerage: null,
      priceMap,
    });
    expect(isTrue).toEqual(false);

    priceMap.set("DRIV", {
      bid: 13,
      mid: 13,
      ask: 13,
      open: 13,
      high: 13,
      low: 13,
      close: 13,
    });
    isTrue = await condition.isTrue({
      portfolio,
      strategy,
      currentTime: new Date(),
      brokerage: null,
      priceMap,
    });
    expect(isTrue).toEqual(true);

    priceMap.set("DRIV", {
      bid: 20,
      mid: 20,
      ask: 20,
      open: 20,
      high: 20,
      low: 20,
      close: 20,
    });
    isTrue = await condition.isTrue({
      portfolio,
      strategy,
      currentTime: new Date(),
      brokerage: null,
      priceMap,
    });
    expect(isTrue).toEqual(true);

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
      portfolio,
      strategy,
      currentTime: new Date(),
      brokerage: null,
      priceMap,
    });
    expect(isTrue).toEqual(false);

    priceMap.set("DRIV", {
      bid: 1,
      mid: 1,
      ask: 1,
      open: 1,
      high: 1,
      low: 1,
      close: 1,
    });
    isTrue = await condition.isTrue({
      portfolio,
      strategy,
      currentTime: new Date(),
      brokerage: null,
      priceMap,
    });
    expect(isTrue).toEqual(false);
  });

  test("Testing condition is true when the option is up less than 50%", async () => {
    const strategies = await Strategy.find();
    const strategy = strategies[1];
    const priceMap: PriceMap = new PriceMap();
    // bought for $10/conract
    let option = new Option("DRIV");
    option.symbol = "DRIV210219C00015000";
    const condition = new PositionPercentChangeCondition({
      targetAssets: [option],
      percentChange: 50,
      comparator: Comparator.LESS_THAN_OR_EQUAL_TO,
    });
    let isTrue: boolean;
    let portfolio = await Portfolio.findByStrategy(strategy, user.id);
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
      portfolio,
      strategy,
      currentTime: new Date(),
      brokerage: null,
      priceMap,
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
      currentTime: new Date(),
      brokerage: null,
      priceMap,
      portfolio,
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
      currentTime: new Date(),
      brokerage: null,
      priceMap,
      portfolio,
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
      currentTime: new Date(),
      brokerage: null,
      priceMap,
      portfolio,
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
      currentTime: new Date(),
      brokerage: null,
      priceMap,
      portfolio,
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
      portfolio,
      strategy,
      currentTime: new Date(),
      brokerage: null,
      priceMap,
    });
    expect(isTrue).toEqual(true);
  });
});
