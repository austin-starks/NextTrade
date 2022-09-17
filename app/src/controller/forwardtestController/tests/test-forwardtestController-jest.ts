import { afterAll, afterEach, beforeAll, describe, test } from "@jest/globals";
import "dotenv/config";
import ForwardTest from "..";
import { PurchaseAndSaleAllocation } from "../../../models/allocation";
import { Stock } from "../../../models/asset";
import { TestBrokerage } from "../../../models/brokerage";
import {
  HavePositionCondition,
  SimplePriceCondition,
} from "../../../models/conditions";
import Portfolio from "../../../models/portfolio";
import Strategy, { IStrategy } from "../../../models/strategy";
import User from "../../../models/user";
import DbHandler from "../../../services/db";
import {
  AllocationEnum,
  BrokerageEnum,
  Comparator,
  FillProbabilityEnum,
  OrderTypeEnum,
  PercentOrDollarsEnum,
} from "../../../utils";

const dbHandler = new DbHandler("test");
const COMMISSION = {
  stockCommission: { val: 0, type: PercentOrDollarsEnum.DOLLARS },
  optionCommission: { val: 0, type: PercentOrDollarsEnum.DOLLARS },
  cryptoCommission: { val: 0, type: PercentOrDollarsEnum.DOLLARS },
};

beforeAll(async () => {
  await dbHandler.connect();
});

beforeEach(async () => {});

afterEach(async () => await dbHandler.clearDatabase());

afterAll(async () => {
  await dbHandler.closeDatabase();
});

const EMAIL = "example@gmail.com";

async function initializePortfolioWithNoPositionCondition() {
  const userInfo = {
    password: "12345678",
    phoneNumber: "555-555-5555",
    firstName: "John",
    lastName: "Doe",

    email: EMAIL,
    brokerage: {
      name: BrokerageEnum.TEST,
      authDetails: {
        token: process.env.TRADIER_TOKEN,
        accountId: process.env.TRADIER_ACCOUNT_ID,
      },
    },
  };
  const user = new User(userInfo);
  await user.save();

  const strategyObj: IStrategy = {
    name: "Buying COIN!!!",
    userId: user.id,
    targetAsset: new Stock("COIN"),
    buyingConditions: [],
    sellingConditions: [],
    buyAmount: new PurchaseAndSaleAllocation({
      amount: 2000,
      type: AllocationEnum.DOLLARS,
    }),
    sellAmount: new PurchaseAndSaleAllocation({
      amount: 500,
      type: AllocationEnum.DOLLARS,
    }),
  };
  const strategy = new Strategy(strategyObj);
  strategy.addBuyingCondition(
    HavePositionCondition.HaveNoPositions([new Stock("COIN")])
  );
  await strategy.save();
  const portfolio = new Portfolio({
    userId: user.id,
    name: "First automated trading strategy",
    initialValue: 10000,
    paperConfig: {
      orderType: OrderTypeEnum.MARKET,
      commission: COMMISSION,
      fillAt: FillProbabilityEnum.LIKELY_TO_FILL,
    },
  });
  portfolio.addStrategy(strategy);
  portfolio.active = true;
  await portfolio.save();
}

async function initializePortfolioWithPriceCondition() {
  const userInfo = {
    password: "12345678",
    phoneNumber: "555-555-5555",
    firstName: "John",
    lastName: "Doe",

    email: "example@gmail.com",
    brokerage: {
      name: BrokerageEnum.TEST,
      authDetails: {
        token: process.env.TRADIER_TOKEN,
        accountId: process.env.TRADIER_ACCOUNT_ID,
      },
    },
  };
  const user = new User(userInfo);
  await user.save();

  const strategyObj: IStrategy = {
    name: "Buying COIN!!!",
    userId: user.id,
    targetAsset: new Stock("COIN"),
    buyingConditions: [],
    sellingConditions: [],
    buyAmount: new PurchaseAndSaleAllocation({
      amount: 2000,
      type: AllocationEnum.DOLLARS,
    }),
    sellAmount: new PurchaseAndSaleAllocation({
      amount: 500,
      type: AllocationEnum.DOLLARS,
    }),
  };
  const strategy = new Strategy(strategyObj);
  strategy.addBuyingCondition(
    new SimplePriceCondition({
      targetPrice: 100,
      comparator: Comparator.LESS_THAN_OR_EQUAL_TO,
    })
  );
  await strategy.save();
  const portfolio = new Portfolio({
    userId: user.id,
    name: "First automated trading strategy",
    initialValue: 10000,
    paperConfig: {
      orderType: OrderTypeEnum.MARKET,
      commission: COMMISSION,
      fillAt: FillProbabilityEnum.LIKELY_TO_FILL,
    },
  });
  portfolio.addStrategy(strategy);
  portfolio.active = true;
  await portfolio.save();
}

describe("Testing forwardtest controller with COIN stock in a variety of scenarios", () => {
  test("Run loop purchases COIN in the first loop", async () => {
    await initializePortfolioWithNoPositionCondition();
    const user = await User.findByEmail(EMAIL);
    // const allPortfolios = await Portfolio.findByUserId(user.id);
    const forwardTest = new ForwardTest(user.id, user.brokerage);
    forwardTest.printPortfolio = false;
    const obj = {
      bid: 100,
      mid: 101,
      ask: 102,
      high: 105,
      low: 98,
    };
    // initialize map with data
    const brokerage = forwardTest.brokerage as TestBrokerage;
    brokerage.setPriceObj(new Stock("COIN"), obj);
    await forwardTest.initialize();
    await forwardTest.runLoop();
    const portfolios = await Portfolio.findByUserId(user.id);
    const portfolio = portfolios[0];
    expect(portfolio.containsPositionName("COIN")).toBe(true);
  });

  test("Run loop purchases COIN in the second loop", async () => {
    await initializePortfolioWithPriceCondition();
    const user = await User.findByEmail(EMAIL);
    const forwardTest = new ForwardTest(user.id, user.brokerage);
    forwardTest.printPortfolio = false;
    // initialize map with data
    const brokerage = forwardTest.brokerage as TestBrokerage;
    brokerage.setPriceObj(new Stock("COIN"), {
      bid: 100,
      mid: 101,
      ask: 102,
      high: 105,
      low: 98,
    });
    await forwardTest.initialize();
    await forwardTest.runLoop();
    let portfolios = await Portfolio.findByUserId(user.id);
    let portfolio = portfolios[0];
    expect(portfolio.containsPositionName("COIN")).toBe(false);

    brokerage.setPriceObj(new Stock("COIN"), {
      bid: 99,
      mid: 100,
      ask: 101,
      high: 105,
      low: 98,
    });
    await forwardTest.runLoop();
    portfolios = await Portfolio.findByUserId(user.id);
    portfolio = portfolios[0];
    expect(portfolio.containsPositionName("COIN")).toBe(true);
  });
});
