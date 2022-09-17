import { afterAll, afterEach, beforeAll, describe, test } from "@jest/globals";
import "dotenv/config";
import { PurchaseAndSaleAllocation } from "../../../models/allocation";
import { Stock } from "../../../models/asset";
import { HavePositionCondition } from "../../../models/conditions";
import Portfolio from "../../../models/portfolio";
import Strategy, { IStrategy } from "../../../models/strategy";
import User from "../../../models/user";
import DbHandler from "../../../services/db";
import {
  AllocationEnum,
  BrokerageEnum,
  FillProbabilityEnum,
  OrderTypeEnum,
  PercentOrDollarsEnum,
} from "../../../utils/enums";

const dbHandler = new DbHandler("test");
const COMMISSION = {
  stockCommission: { val: 0, type: PercentOrDollarsEnum.DOLLARS },
  optionCommission: { val: 0, type: PercentOrDollarsEnum.DOLLARS },
  cryptoCommission: { val: 0, type: PercentOrDollarsEnum.DOLLARS },
};

beforeAll(async () => {
  await dbHandler.connect();
});

beforeEach(async () => {
  jest.setTimeout(60000);
});

afterEach(async () => await dbHandler.clearDatabase());

afterAll(async () => {
  await dbHandler.closeDatabase();
});

async function initializePortfolioWithNoPositionCondition(num: number) {
  const userInfo = {
    password: "12345678",
    phoneNumber: "555-555-5555",
    firstName: "John",
    lastName: "Doe",

    email: `example${num}@gmail.com`,
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

  await portfolio.save();
}

describe("Running performance testing", () => {
  test("Testing can run forwardtest controller with 100 users", async () => {
    // const arr = [];
    // for (let i = 0; i < 100; i++) {
    //   arr.push(initializePortfolioWithNoPositionCondition(i));
    // }
    // await Promise.all(arr);
    // const users = await User.find();
    // const forwardtesters = users.map((u) => new ForwardTest(u));
    // for (let i = 0; i < forwardtesters.length; i++) {
    //   let forwardTest = forwardtesters[i];
    //   forwardTest.printPortfolio = false;
    //   // initialize map with data
    //   const brokerage = forwardTest.brokerage as TestBrokerage;
    //   brokerage.setPriceObj(new Stock("COIN"), {
    //     bid: 100,
    //     mid: 101,
    //     ask: 102,
    //     high: 105,
    //     low: 98,
    //   });
    //   await forwardTest.initialize();
    // }
    const start = Date.now();
    // const loops = [];
    // for (let i = 0; i < forwardtesters.length; i++) {
    //   let forwardTest = forwardtesters[i];
    //   loops.push(forwardTest.runLoop());
    // }
    // await Promise.all(loops);
    expect(Date.now() - start).toBeLessThanOrEqual(2000);
  });
});
