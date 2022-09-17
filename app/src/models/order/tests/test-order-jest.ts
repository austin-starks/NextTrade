import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "@jest/globals";
import Order from "..";
import DbHandler from "../../../services/db";
import {
  BrokerageEnum,
  BuyOrSellEnum,
  DeploymentEnum,
  OrderStatusEnum,
  OrderTypeEnum,
} from "../../../utils/enums";
import { Stock } from "../../asset";
import BrokergeFactory from "../../brokerage";
import Portfolio from "../../portfolio";
import PriceMap from "../../priceMap";
import User from "../../user";

const dbHandler: DbHandler = new DbHandler("test");
var user: User;
var portfolio: Portfolio;
const brokerage = BrokergeFactory.create({
  name: BrokerageEnum.TEST,
  authDetails: null,
});

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
  portfolio = new Portfolio({
    userId: user.id,
    name: "First automated trading strategy",
    initialValue: 2000,
  });
  await portfolio.save();
});

afterEach(async () => await dbHandler.clearDatabase());

afterAll(async () => {
  await dbHandler.closeDatabase();
});

describe("Testing order functionality", () => {
  test("Can update paper orders when price hasn't changed (buying)", async () => {
    const order = new Order({
      brokerageId: BrokerageEnum.TEST,
      quantity: 100,
      status: OrderStatusEnum.PENDING,
      priceOfAsset: 10,
      type: OrderTypeEnum.LIMIT,
      asset: new Stock("OSCR"),
      side: BuyOrSellEnum.BUY,
      deployment: DeploymentEnum.PAPER,
      strategyId: null,
      portfolioId: portfolio._id,
      userId: user.id,
      otherData: {},
    });
    await order.save();
    const priceobj = {
      bid: 9,
      mid: 10,
      ask: 11,
      open: 9,
      high: 13,
      low: 9,
      close: 10,
    };
    const priceMap: PriceMap = new PriceMap();
    priceMap.set("OSCR", priceobj);
    await brokerage.updatePaperOrders(user.id, priceMap);
    const filledOrders = await Order.getFilledOrders(user.id);
    expect(filledOrders.length).toEqual(0);
  });

  test("Can update paper orders when price has gone up (buying)", async () => {
    const order = new Order({
      brokerageId: BrokerageEnum.TEST,
      quantity: 100,
      status: OrderStatusEnum.PENDING,
      priceOfAsset: 10,
      type: OrderTypeEnum.LIMIT,
      asset: new Stock("OSCR"),
      side: BuyOrSellEnum.BUY,
      deployment: DeploymentEnum.PAPER,
      strategyId: null,
      portfolioId: portfolio._id,
      userId: user.id,
      otherData: {},
    });
    await order.save();
    const priceobj = {
      bid: 10,
      mid: 11,
      ask: 12,
      open: 10,
      high: 14,
      low: 10,
      close: 11,
    };
    const priceMap: PriceMap = new PriceMap();
    priceMap.set("OSCR", priceobj);
    await brokerage.updatePaperOrders(user.id, priceMap);
    const filledOrders = await Order.getFilledOrders(user.id);
    expect(filledOrders.length).toEqual(0);
  });

  test("Can update paper orders when price has gone down (buying)", async () => {
    const order = new Order({
      brokerageId: BrokerageEnum.TEST,
      quantity: 100,
      status: OrderStatusEnum.PENDING,
      priceOfAsset: 10,
      type: OrderTypeEnum.LIMIT,
      asset: new Stock("OSCR"),
      side: BuyOrSellEnum.BUY,
      deployment: DeploymentEnum.PAPER,
      strategyId: null,
      portfolioId: portfolio._id,
      userId: user.id,
      otherData: {},
    });
    await order.save();
    const priceobj = {
      bid: 8,
      mid: 9,
      ask: 10,
      open: 9,
      high: 13,
      low: 9,
      close: 9,
    };
    const priceMap: PriceMap = new PriceMap();
    priceMap.set("OSCR", priceobj);
    await brokerage.updatePaperOrders(user.id, priceMap);
    const filledOrders = await Order.getFilledOrders(user.id);
    expect(filledOrders.length).toEqual(1);
    expect(filledOrders[0].price).toBeLessThanOrEqual(order.price);
  });

  test("Can update paper orders when price hasn't changed (selling)", async () => {
    const order = new Order({
      brokerageId: BrokerageEnum.TEST,
      quantity: 100,
      status: OrderStatusEnum.PENDING,
      priceOfAsset: 10,
      type: OrderTypeEnum.LIMIT,
      asset: new Stock("OSCR"),
      side: BuyOrSellEnum.SELL,
      deployment: DeploymentEnum.PAPER,
      strategyId: null,
      portfolioId: portfolio._id,
      userId: user.id,
      otherData: {},
    });
    await order.save();
    const priceobj = {
      bid: 9,
      mid: 10,
      ask: 11,
      open: 9,
      high: 13,
      low: 9,
      close: 10,
    };
    const priceMap: PriceMap = new PriceMap();
    priceMap.set("OSCR", priceobj);
    await brokerage.updatePaperOrders(user.id, priceMap);
    const filledOrders = await Order.getFilledOrders(user.id);
    expect(filledOrders.length).toEqual(0);
  });

  test("Can update paper orders when price has gone up (selling)", async () => {
    const order = new Order({
      brokerageId: BrokerageEnum.TEST,
      quantity: 100,
      status: OrderStatusEnum.PENDING,
      priceOfAsset: 10,
      type: OrderTypeEnum.LIMIT,
      asset: new Stock("OSCR"),
      side: BuyOrSellEnum.SELL,
      deployment: DeploymentEnum.PAPER,
      strategyId: null,
      portfolioId: portfolio._id,
      userId: user.id,
      otherData: {},
    });
    await order.save();
    const priceobj = {
      bid: 10,
      mid: 11,
      ask: 12,
      open: 10,
      high: 14,
      low: 10,
      close: 11,
    };
    const priceMap: PriceMap = new PriceMap();
    priceMap.set("OSCR", priceobj);
    await brokerage.updatePaperOrders(user.id, priceMap);
    const filledOrders = await Order.getFilledOrders(user.id);
    expect(filledOrders.length).toEqual(1);
    expect(filledOrders[0].price).toBeGreaterThanOrEqual(order.price);
  });

  test("Can update paper orders when price has gone down (selling)", async () => {
    const order = new Order({
      brokerageId: BrokerageEnum.TEST,
      quantity: 100,
      status: OrderStatusEnum.PENDING,
      priceOfAsset: 10,
      type: OrderTypeEnum.LIMIT,
      asset: new Stock("OSCR"),
      side: BuyOrSellEnum.SELL,
      deployment: DeploymentEnum.PAPER,
      strategyId: null,
      portfolioId: portfolio._id,
      userId: user.id,
      otherData: {},
    });
    await order.save();
    const priceobj = {
      bid: 8,
      mid: 9,
      ask: 10,
      open: 9,
      high: 13,
      low: 9,
      close: 9,
    };
    const priceMap: PriceMap = new PriceMap();
    priceMap.set("OSCR", priceobj);
    await brokerage.updatePaperOrders(user.id, priceMap);
    const filledOrders = await Order.getFilledOrders(user.id);
    expect(filledOrders.length).toEqual(0);
  });
});
