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
import ConditionFactory, { AbstractCondition, SimplePriceCondition } from "..";
import DbHandler from "../../../services/db";
import {
  AllocationEnum,
  BrokerageEnum,
  Comparator,
  ConditionEnum,
  OrderTypeEnum,
} from "../../../utils/enums";
import { PurchaseAndSaleAllocation } from "../../allocation";
import { Stock } from "../../asset";
import PriceMap from "../../priceMap";
import Strategy from "../../strategy";
import User from "../../user";

const dbHandler = new DbHandler("test");
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
  const strategyObj = {
    name: "Buy Boomers",
    userId: user.id,
    targetAsset: new Stock("QQQ"),
    buyingConditions: [],
    sellingConditions: [],
    initialValue: 10000,
    orderType: OrderTypeEnum.MARKET,
    buyAmount: new PurchaseAndSaleAllocation({
      amount: 40,
      type: AllocationEnum.PERCENT_OF_BUYING_POWER,
    }),
    sellAmount: new PurchaseAndSaleAllocation({
      amount: 25,
      type: AllocationEnum.PERCENT_OF_PORTFOLIO,
    }),
  };
  const strategy = new Strategy(strategyObj);
  const bCondition = new SimplePriceCondition({
    targetPrice: 300,
    comparator: Comparator.LESS_THAN,
  });
  strategy.addBuyingCondition(bCondition);
  const sCondition = new SimplePriceCondition({
    targetPrice: 325,
    comparator: Comparator.GREATER_THAN_OR_EQUAL_TO,
  });
  strategy.addSellingCondition(sCondition);
  await strategy.save();
});

afterEach(async () => await dbHandler.clearDatabase());

afterAll(async () => {
  await dbHandler.closeDatabase();
});

describe("Test integration of conditions with strategy", () => {
  test("Can get conditions after saving the strategy to a DB", async () => {
    const strategy = await Strategy.findByName("Buy Boomers", user.id);
    const buyingConditions = strategy.buyingConditions;
    expect(buyingConditions[0].type).toEqual(
      ConditionEnum.SimplePriceCondition
    );
    const sellingConditions: any = strategy.sellingConditions;
    expect(sellingConditions[0].comparator).toEqual(
      Comparator.GREATER_THAN_OR_EQUAL_TO
    );
  });

  test("Can execute isTrue on condition after saving to a database", async () => {
    const strategy = await Strategy.findByName("Buy Boomers", user.id);
    const assetName = strategy.targetAsset.name;
    const buyingConditionsObj = strategy.buyingConditions;
    const buyingConditions = ConditionFactory.createFromArray(
      buyingConditionsObj
    ) as SimplePriceCondition[];
    expect(buyingConditions[0].targetPrice).toEqual(300);
    const sellingConditionsObj = strategy.sellingConditions;
    const sellingConditions = ConditionFactory.createFromArray(
      sellingConditionsObj
    ) as SimplePriceCondition[];
    expect(sellingConditions[0].comparator).toEqual(
      Comparator.GREATER_THAN_OR_EQUAL_TO
    );
    // expect(sellingConditionsObj[0].isTrue).toBeUndefined();
    expect(sellingConditions[0].isTrue).toBeDefined();

    let priceMap: PriceMap = new PriceMap();
    priceMap.set(assetName, {
      bid: 326,
      mid: 326,
      ask: 326,
      high: 326,
      low: 326,
    });
    const isTrue = await sellingConditions[0].isTrue({
      strategy: strategy,
      brokerage: null,
      currentTime: new Date(),
      priceMap: priceMap,
      portfolio: null,
    });
    expect(isTrue).toEqual(true);

    priceMap.set(assetName, {
      bid: 324,
      mid: 324,
      ask: 324,
      high: 324,
      low: 324,
    });
    const isFalse = await (sellingConditions[0] as AbstractCondition).isTrue({
      strategy: strategy,
      brokerage: null,
      currentTime: new Date(),
      priceMap: priceMap,
      portfolio: null,
    });
    expect(isFalse).toEqual(false);
  });
});
