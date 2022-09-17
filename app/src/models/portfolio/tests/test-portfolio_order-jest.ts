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
import Portfolio from "..";
import DbHandler from "../../../services/db";
import {
  AllocationEnum,
  BrokerageEnum,
  BuyOrSellEnum,
  OptionTypeEnum,
  OrderStatusEnum,
  OrderTypeEnum,
  PercentOrDollarsEnum,
  StrikePriceEnum,
} from "../../../utils/enums";
import { Allocation, PurchaseAndSaleAllocation } from "../../allocation";
import {
  DebitSpread,
  ExpirationConfig,
  Option,
  Stock,
  StrikePriceConfig,
} from "../../asset";
import Order from "../../order";
import PriceMap from "../../priceMap";
import Strategy from "../../strategy";
import User from "../../user";

const dbHandler = new DbHandler("test");
var user: User;
var portfolio: Portfolio;

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
    initialValue: 10000,
  });
});

afterEach(async () => await dbHandler.clearDatabase());

afterAll(async () => {
  await dbHandler.closeDatabase();
});

describe("Test integration of strategy with order", () => {
  test("Can buy positions multiple times for an order", async () => {
    const assetName = "NET";
    const order1 = new Order({
      userId: user.id,
      brokerageId: "ehu7y6548sud565432wsdfg",
      quantity: 100,
      status: OrderStatusEnum.FILLED,
      priceOfAsset: 10,
      type: OrderTypeEnum.MARKET,
      asset: new Stock(assetName),
      strategyId: "" as any,
      portfolioId: portfolio._id,
      deployment: portfolio.deployment,
      side: BuyOrSellEnum.BUY,
    });
    expect(portfolio.containsPosition(assetName)).toEqual(false);
    await portfolio.updatePositions(order1);
    expect(portfolio.containsPosition(assetName)).toEqual(true);
    expect(portfolio.buyingPower).toEqual(9000);
    const order2 = new Order({
      brokerageId: "ehu7y654512a65432wsdfg",
      userId: user.id,
      quantity: 100,
      status: OrderStatusEnum.FILLED,
      priceOfAsset: 5,
      type: OrderTypeEnum.MARKET,
      asset: new Stock(assetName),
      strategyId: "" as any,
      portfolioId: portfolio._id,
      deployment: portfolio.deployment,
      side: BuyOrSellEnum.BUY,
    });
    await portfolio.updatePositions(order2);
    expect(portfolio.buyingPower).toEqual(8500);
    const positions = portfolio.positions;
    expect(positions[0].quantity).toEqual(200);
  });

  test("Testing the calculateQuantityToSell method in strategy", async () => {
    const strategyObj = {
      name: "ARKK Buy Low Sell High",
      userId: user.id,
      targetAsset: new Stock("ARKK"),
      buyingConditions: [],
      sellingConditions: [],
      initialValue: 10000,
      buyAmount: new PurchaseAndSaleAllocation({
        amount: 1000,
        type: AllocationEnum.DOLLARS,
      }),
      sellAmount: new PurchaseAndSaleAllocation({
        amount: 2000,
        type: AllocationEnum.DOLLARS,
      }),
    };
    let strategy = new Strategy(strategyObj);

    const order2 = new Order({
      brokerageId: "ehu7y654512a65432wsdfg",
      quantity: 150,
      userId: user.id,
      status: OrderStatusEnum.FILLED,
      priceOfAsset: 20,
      type: OrderTypeEnum.MARKET,
      asset: new Stock("ARKK"),
      strategyId: "" as any,
      portfolioId: portfolio._id,
      deployment: portfolio.deployment,
      side: BuyOrSellEnum.BUY,
    });
    await portfolio.updatePositions(order2);
    const priceobj = {
      bid: 119.96,
      mid: 120.0,
      ask: 120.04,
      open: 119.9,
      high: 121.1,
      low: 119.1,
      close: 119.12,
    };
    const map: PriceMap = new PriceMap();
    map.set("ARKK", priceobj);
    const amount = Allocation.calculateQuantityToSell(
      order2.asset,
      map,
      strategy.sellAmount,
      portfolio.buyingPower,
      portfolio.positions,
      portfolio.config
    );
    expect(Math.floor(amount)).toBe(16);
  });

  test("Can sell a position from an order", async () => {
    const assetName = "NET";
    const strategyObj = {
      name: "Buy Boomers",
      userId: user.id,
      targetAsset: new Stock(assetName),
      buyingConditions: [],
      sellingConditions: [],
      initialValue: 10000,
      orderType: OrderTypeEnum.MARKET,
      buyAmount: new PurchaseAndSaleAllocation({
        amount: 0.4,
        type: AllocationEnum.PERCENT_OF_BUYING_POWER,
      }),
      sellAmount: new PurchaseAndSaleAllocation({
        amount: 0.25,
        type: AllocationEnum.PERCENT_OF_PORTFOLIO,
      }),
    };
    const strategy = new Strategy(strategyObj);
    const orderBuy = new Order({
      brokerageId: "ehu7y6545609235432wsdfg",
      userId: user.id,
      quantity: 100,
      status: OrderStatusEnum.FILLED,
      priceOfAsset: 10,
      type: OrderTypeEnum.MARKET,
      asset: strategy.targetAsset,
      strategyId: strategy.id,
      portfolioId: portfolio._id,
      deployment: portfolio.deployment,
      side: BuyOrSellEnum.BUY,
    });
    await portfolio.updatePositions(orderBuy);
    expect(portfolio.containsPosition(assetName)).toEqual(true);
    expect(portfolio.buyingPower).toEqual(9000);

    const orderSell1 = new Order({
      brokerageId: "ehu7y654565432ws1qsdfg",
      userId: user.id,
      quantity: 50,
      status: OrderStatusEnum.FILLED,
      priceOfAsset: 10,
      type: OrderTypeEnum.MARKET,
      asset: strategy.targetAsset,
      strategyId: strategy.id,
      portfolioId: portfolio._id,
      deployment: portfolio.deployment,
      side: BuyOrSellEnum.SELL,
    });
    await portfolio.updatePositions(orderSell1);
    expect(portfolio.containsPosition(assetName)).toEqual(true);
    expect(portfolio.buyingPower).toEqual(9500);

    const orderSell2 = new Order({
      brokerageId: "ehu7y6590sd4565432wsdfg",
      userId: user.id,
      quantity: 50,
      status: OrderStatusEnum.FILLED,
      priceOfAsset: 10,
      type: OrderTypeEnum.MARKET,
      asset: strategy.targetAsset,
      strategyId: strategy.id,
      portfolioId: portfolio._id,
      deployment: portfolio.deployment,
      side: BuyOrSellEnum.SELL,
    });
    await portfolio.updatePositions(orderSell2);
    expect(portfolio.containsPosition(assetName)).toEqual(false);
    expect(portfolio.buyingPower).toEqual(10000);
    expect(portfolio.positions.length).toEqual(0);
  });

  test("Buying a debit spread adds 2 positions to strategy", async () => {
    const assetName = "QQQ";
    const long = new Option(assetName, {
      expirationDateConfig: new ExpirationConfig(),
      strikePriceConfig: new StrikePriceConfig(
        StrikePriceEnum.OTM,
        20,
        PercentOrDollarsEnum.DOLLARS
      ),
      optionType: OptionTypeEnum.CALL,
    });
    long.symbol = "QQQ210917C00370000";
    const short = new Option(assetName, {
      expirationDateConfig: new ExpirationConfig(),
      strikePriceConfig: new StrikePriceConfig(
        StrikePriceEnum.OTM,
        30,
        PercentOrDollarsEnum.DOLLARS
      ),
      optionType: OptionTypeEnum.CALL,
    });
    short.symbol = "QQQ210917C00380000";

    const priceMap = new PriceMap();
    priceMap.set("QQQ210917C00370000", { bid: 7, ask: 7, mid: 7 });
    priceMap.set("QQQ210917C00380000", { bid: 2, ask: 2, mid: 2 });
    const targetAsset = new DebitSpread(long, short);
    const strategyObj = {
      name: "Buy Boomers",
      userId: user.id,
      targetAsset: targetAsset,
      buyingConditions: [],
      sellingConditions: [],
      initialValue: 10000,
      orderType: OrderTypeEnum.MARKET,
      buyAmount: new PurchaseAndSaleAllocation({
        amount: 0.4,
        type: AllocationEnum.PERCENT_OF_BUYING_POWER,
      }),
      sellAmount: new PurchaseAndSaleAllocation({
        amount: 0.25,
        type: AllocationEnum.PERCENT_OF_PORTFOLIO,
      }),
    };
    const strategy = new Strategy(strategyObj);
    const orderBuy = new Order({
      brokerageId: "34567uijhgtr456789",
      userId: user.id,
      quantity: 1,
      status: OrderStatusEnum.FILLED,
      priceOfAsset: 500,
      type: OrderTypeEnum.MARKET,
      asset: targetAsset,
      strategyId: strategy.id,
      portfolioId: portfolio._id,
      deployment: portfolio.deployment,
      side: BuyOrSellEnum.BUY,
      otherData: priceMap.getSpreadObj(targetAsset),
    });
    await portfolio.updatePositions(orderBuy);
    expect(portfolio.containsPositionName(assetName)).toEqual(true);
    expect(portfolio.buyingPower).toEqual(9500);
    expect(portfolio.positions.length).toEqual(2);
  });

  test("Buying a short end of a debit spread sells the position if present in portfolio", async () => {
    const assetName = "QQQ";
    const long = new Option(assetName, {
      expirationDateConfig: new ExpirationConfig(),
      strikePriceConfig: new StrikePriceConfig(
        StrikePriceEnum.OTM,
        20,
        PercentOrDollarsEnum.DOLLARS
      ),
      optionType: OptionTypeEnum.CALL,
    });
    long.symbol = "QQQ210917C00370000";

    const short = new Option(assetName, {
      expirationDateConfig: new ExpirationConfig(),
      strikePriceConfig: new StrikePriceConfig(
        StrikePriceEnum.OTM,
        30,
        PercentOrDollarsEnum.DOLLARS
      ),
      optionType: OptionTypeEnum.CALL,
    });
    short.symbol = "QQQ210917C00380000";

    const existing = new Option(assetName, {
      expirationDateConfig: new ExpirationConfig(),
      strikePriceConfig: new StrikePriceConfig(
        StrikePriceEnum.OTM,
        30,
        PercentOrDollarsEnum.DOLLARS
      ),
      optionType: OptionTypeEnum.CALL,
    });
    existing.symbol = "QQQ210917C00380000";

    const priceMap = new PriceMap();
    priceMap.set("QQQ210917C00370000", { bid: 7, ask: 7, mid: 7 });
    priceMap.set("QQQ210917C00380000", { bid: 2, ask: 2, mid: 2 });
    const targetAsset = new DebitSpread(long, short);
    const strategyObj = {
      name: "Buy Boomers",
      userId: user.id,
      targetAsset: targetAsset,
      buyingConditions: [],
      sellingConditions: [],
      initialValue: 10000,
      orderType: OrderTypeEnum.MARKET,
      buyAmount: new PurchaseAndSaleAllocation({
        amount: 0.4,
        type: AllocationEnum.PERCENT_OF_BUYING_POWER,
      }),
      sellAmount: new PurchaseAndSaleAllocation({
        amount: 0.25,
        type: AllocationEnum.PERCENT_OF_PORTFOLIO,
      }),
    };
    const strategy = new Strategy(strategyObj);
    const orderExisting = new Order({
      brokerageId: "34567uijhgtr456789",
      userId: user.id,
      quantity: 1,
      status: OrderStatusEnum.FILLED,
      priceOfAsset: 200,
      type: OrderTypeEnum.MARKET,
      asset: existing,
      strategyId: strategy.id,
      portfolioId: portfolio._id,
      deployment: portfolio.deployment,
      side: BuyOrSellEnum.BUY,
      otherData: priceMap.getSpreadObj(existing),
    });
    await portfolio.updatePositions(orderExisting);
    const orderBuy = new Order({
      brokerageId: "345671837ytgtr456789",
      userId: user.id,
      quantity: 1,
      status: OrderStatusEnum.FILLED,
      priceOfAsset: 500,
      type: OrderTypeEnum.MARKET,
      asset: targetAsset,
      strategyId: strategy.id,
      portfolioId: portfolio._id,
      deployment: portfolio.deployment,
      side: BuyOrSellEnum.BUY,
      otherData: priceMap.getSpreadObj(targetAsset),
    });
    await portfolio.updatePositions(orderBuy);
    expect(portfolio.containsPositionName(assetName)).toEqual(true);
    expect(portfolio.buyingPower).toEqual(9300);
    expect(portfolio.positions.length).toEqual(1);
  });
});
