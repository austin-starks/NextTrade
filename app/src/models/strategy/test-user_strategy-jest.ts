import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
} from "@jest/globals";
import "dotenv/config";
import Strategy from ".";
import DbHandler from "../../services/db";
import {
  AllocationEnum,
  BrokerageEnum,
  OrderTypeEnum,
} from "../../utils/enums";
import { PurchaseAndSaleAllocation } from "../allocation";
import { Stock } from "../asset";
import User from "../user";

const dbHandler = new DbHandler("test");

beforeAll(async () => {
  await dbHandler.connect();
});

afterEach(async () => await dbHandler.clearDatabase());

afterAll(async () => {
  await dbHandler.closeDatabase();
});

describe("Test integration of users with strategy", () => {
  test("Can associate a user with a strategy", async () => {
    const userInfo = {
      password: "12345678",
      firstName: "John",
      lastName: "Doe",
      phoneNumber: "555-555-5555",
      email: "example@gmail.com",
      brokerage: {
        name: BrokerageEnum.TRADIER,
        authDetails: {
          token: "",
          accountId: "",
        },
      },
    };
    const user = new User(userInfo);
    await user.save();
    const strategyObj = {
      name: "Buy Boomers",
      userId: user.id,
      targetAsset: new Stock("ICLN"),
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
    await strategy.save();
    const userStrategies = await Strategy.find();
    expect(userStrategies[0].name).toEqual("Buy Boomers");
  });
});
