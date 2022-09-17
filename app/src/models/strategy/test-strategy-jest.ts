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
import Strategy, { IPrototypeStrategy, IStrategy } from ".";
import DbHandler from "../../services/db";
import {
  AllocationEnum,
  BrokerageEnum,
  Comparator,
  FillProbabilityEnum,
} from "../../utils/enums";
import { Allocation, PurchaseAndSaleAllocation } from "../allocation";
import { Option, Stock } from "../asset";
import Cryptocurrency from "../asset/Cryptocurrency";
import { SimplePriceCondition } from "../conditions";
import PriceMap from "../priceMap";
import User from "../user";

const dbHandler: DbHandler = new DbHandler("test");
var user: User;

beforeAll(async () => {
  process.env.MONGOOSE_ENC_SECRET = "super-secret-key";
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

describe("Strategy Tests", () => {
  test("Can create a new strategy", () => {
    const strategyObj: IStrategy = {
      name: "ARKK Buy Low Sell High",
      userId: user.id,
      targetAsset: new Option("ARKK"),
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
    expect(strategy.name).toEqual("ARKK Buy Low Sell High");
    expect(strategy.buyAmount.amount).toEqual(2000);
    expect(strategy.sellAmount.type).toEqual(AllocationEnum.DOLLARS);
  });

  test("Can save strategy to the database", async () => {
    const strategyObj: IStrategy = {
      name: "ARKK Buy Low Sell High",
      userId: user.id,
      targetAsset: new Option("ARKG"),
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
    await strategy.save();
    const dbStrategy = await Strategy.findByName(
      "ARKK Buy Low Sell High",
      user.id
    );
    expect(dbStrategy.name).toEqual("ARKK Buy Low Sell High");
    expect(dbStrategy.targetAsset).toEqual(new Option("ARKG"));
  });

  test("Cannot get strategy by name that doesn't exist from database", async () => {
    const strategyObj: IStrategy = {
      name: "ARKK Buy Low Sell High",
      userId: user.id,
      targetAsset: new Stock("ARKG"),
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
    await strategy.save();
    Strategy.findByName("ARKKK Buy Low Sell High", user.id).catch((err) => {
      expect(err).not.toBe(null);
    });
    Strategy.findByName("ARKK Buy Low Sell High", user.id).catch((err) => {
      expect(err).not.toBe(null);
    });
  });

  test("Cannot get strategy by id that doesn't exist from database", async () => {
    const strategyObj: IStrategy = {
      name: "ARKK Buy Low Sell High",
      userId: user.id,
      targetAsset: new Stock("ARKW"),
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
    await strategy.save();
    Strategy.findById("345TGHUY6545TGHJI8U765", user.id).catch((err) => {
      expect(err).not.toBe(null);
    });
  });

  test("Can get strategy by id", async () => {
    const strategyObj: IStrategy = {
      name: "ARKK Buy Low Sell High",
      userId: user.id,
      targetAsset: new Option("ARKG"),
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
    await strategy.save();
    const id = strategy.id;
    Strategy.findById(id, user.id).then((foundStrategy) => {
      expect(foundStrategy.targetAsset.name).toEqual("ARKG");
      expect(foundStrategy.buyAmount.amount).toEqual(2000);
    });
  });
  test("Can delete a strategy by its name", async () => {
    const strategyObj: IStrategy = {
      name: "ARKK Buy Low Sell High",
      userId: user.id,
      targetAsset: new Cryptocurrency("BTC"),
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
    await strategy.save();
    await Strategy.deleteStrategyByName(strategy.name, strategy.userId);
    const found = await Strategy.find();
    expect(found.length).toEqual(0);
  });

  test("Can get all strategies from the database", async () => {
    const strategyObj: IStrategy = {
      name: "ARKK Buy Low Sell High",
      userId: user.id,
      targetAsset: new Cryptocurrency("ETH"),
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
    await strategy.save();

    const strategyObj2: IStrategy = {
      name: "CHADS_DAQ NASDAQ",
      userId: user.id,
      targetAsset: new Cryptocurrency("ETH"),
      buyingConditions: [],
      sellingConditions: [],
      buyAmount: new PurchaseAndSaleAllocation({
        amount: 0.15,
        type: AllocationEnum.PERCENT_OF_BUYING_POWER,
      }),
      sellAmount: new PurchaseAndSaleAllocation({
        amount: 0.25,
        type: AllocationEnum.PERCENT_OF_CURRENT_POSITIONS,
      }),
    };
    const strategy2 = new Strategy(strategyObj2);
    await strategy2.save();

    const strategyList = await Strategy.find();
    expect(strategyList.length).toEqual(2);
  });

  test("Can get all active strategies from the database", async () => {
    const strategyObj: IStrategy = {
      name: "ARKK Buy Low Sell High",
      userId: user.id,
      targetAsset: new Option("PLUG"),
      buyingConditions: [],
      sellingConditions: [],
      buyAmount: new PurchaseAndSaleAllocation({
        amount: 1000,
        type: AllocationEnum.DOLLARS,
      }),
      sellAmount: new PurchaseAndSaleAllocation({
        amount: 2000,
        type: AllocationEnum.DOLLARS,
      }),
    };
    const strategy = new Strategy(strategyObj);
    await strategy.save();

    const strategyObj2: IStrategy = {
      name: "CHADS_DAQ NASDAQ",
      userId: user.id,
      targetAsset: new Option("IWM"),
      buyingConditions: [],
      sellingConditions: [],
      buyAmount: new PurchaseAndSaleAllocation({
        amount: 0.3,
        type: AllocationEnum.PERCENT_OF_PORTFOLIO,
      }),
      sellAmount: new PurchaseAndSaleAllocation({
        amount: 1,
        type: AllocationEnum.PERCENT_OF_CURRENT_POSITIONS,
      }),
    };
    const strategy2 = new Strategy(strategyObj2);
    await strategy2.save();

    const strategyObj3: IStrategy = {
      name: "Crypto Frenzy",
      userId: user.id,
      targetAsset: new Cryptocurrency("DOGE"),
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
    const strategy3 = new Strategy(strategyObj3);
    await strategy3.save();

    const strategyList = await Strategy.find();
    expect(strategyList.length).toEqual(3);
  });

  test("Cannot create strategy with the same name with the same user", async () => {
    const strategyObj: IStrategy = {
      name: "ARKK Buy Low Sell High",
      userId: user.id,
      targetAsset: new Option("QQQ"),
      buyingConditions: [],
      sellingConditions: [],
      buyAmount: new PurchaseAndSaleAllocation({
        amount: 1000,
        type: AllocationEnum.DOLLARS,
      }),
      sellAmount: new PurchaseAndSaleAllocation({
        amount: 2000,
        type: AllocationEnum.DOLLARS,
      }),
    };
    const strategy = new Strategy(strategyObj);
    await strategy.save();

    const strategyObj2: IStrategy = {
      name: "ARKK Buy Low Sell High",
      userId: user.id,
      targetAsset: new Option("XLK"),
      buyingConditions: [],
      sellingConditions: [],
      buyAmount: new PurchaseAndSaleAllocation({
        amount: 1000,
        type: AllocationEnum.DOLLARS,
      }),
      sellAmount: new PurchaseAndSaleAllocation({
        amount: 2000,
        type: AllocationEnum.DOLLARS,
      }),
    };
    const strategy2 = new Strategy(strategyObj2);
    let strategyList = await Strategy.find();
    expect(strategyList.length).toEqual(1);
    try {
      await strategy2.save();
      expect(1).toEqual(2);
    } catch (e) {
      expect(e).not.toBe(null);
    }
    expect(strategyList.length).toEqual(1);
    strategy2.name = "New ARKK Strategy";
    await strategy2.save();
    strategyList = await Strategy.find();
    expect(strategyList.length).toEqual(2);
  });

  test("Testing can add buying condition to buying conditions array using addBuyingConditions and get them", async () => {
    const strategyObj: IStrategy = {
      name: "ARKK Buy Low Sell High",
      userId: user.id,
      targetAsset: new Option("DRIV"),
      buyingConditions: [],
      sellingConditions: [],
      buyAmount: new PurchaseAndSaleAllocation({
        amount: 1000,
        type: AllocationEnum.DOLLARS,
      }),
      sellAmount: new PurchaseAndSaleAllocation({
        amount: 2000,
        type: AllocationEnum.DOLLARS,
      }),
    };
    const strategy = new Strategy(strategyObj);
    let ipriceobj = {
      targetPrice: 10,
      comparator: Comparator.LESS_THAN,
    };
    await strategy.save();

    let condition = new SimplePriceCondition(ipriceobj);
    strategy.addBuyingCondition(condition);
    await strategy.save();
    const conditions = strategy.buyingConditions;
    expect(conditions[0]["comparator"]).toBe("less than");
    expect(conditions[0]["type"]).toBe("Simple Price");
    expect(conditions[0]["targetPrice"]).toBe(10);
  });

  test("Testing can add selling condition to selling conditions array using addSellingConditions and get them", async () => {
    const strategyObj: IStrategy = {
      name: "ARKK Buy Low Sell High",
      userId: user.id,
      targetAsset: new Option("HACK"),
      buyingConditions: [],
      sellingConditions: [],
      buyAmount: new PurchaseAndSaleAllocation({
        amount: 1000,
        type: AllocationEnum.DOLLARS,
      }),
      sellAmount: new PurchaseAndSaleAllocation({
        amount: 2000,
        type: AllocationEnum.DOLLARS,
      }),
    };
    const strategy = new Strategy(strategyObj);
    let ipriceobj = {
      targetPrice: 10,
      comparator: Comparator.LESS_THAN,
    };
    await strategy.save();

    let condition = new SimplePriceCondition(ipriceobj);
    strategy.addSellingCondition(condition);
    await strategy.save();
    const conditions = strategy.sellingConditions;
    expect(conditions[0]["comparator"]).toBe("less than");
    expect(conditions[0]["type"]).toBe("Simple Price");
    expect(conditions[0]["targetPrice"]).toBe(10);
  });

  test("Testing findById returns an error if ID doesn't exist", async () => {
    let strategy: any;
    try {
      strategy = await Strategy.findById("41224d776a326fb40f000001", user.id);
    } catch (err) {
      strategy = err;
    }
    expect(strategy).toStrictEqual(new Error("Strategy ID Not Found"));
  });

  test("Testing the clone method in strategy", async () => {
    const strategyObj: IStrategy = {
      name: "ARKK Buy Low Sell High",
      userId: user.id,
      targetAsset: new Stock("ARKK"),
      buyingConditions: [],
      sellingConditions: [],
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
    const iproto: IPrototypeStrategy = {
      name: "ARKK Clone",
      targetAsset: new Stock("ARKK"),
    };
    let cloned = await strategy.clone(iproto);
    expect(cloned["targetAsset"]).toEqual(strategy["targetAsset"]);
    expect(cloned["minDaysBetweenBuys"]).toEqual(
      strategy["minDaysBetweenBuys"]
    );
    expect(cloned["sellAmount"]).toEqual(strategy["sellAmount"]);
    expect(cloned["buyingConditions"].length).toEqual(0);
    expect(cloned["sellingConditions"].length).toEqual(0);
  });

  test("Testing the calculateQuantityToBuy method in strategy", async () => {
    const strategyObj: IStrategy = {
      name: "ARKK Buy Low Sell High",
      userId: user.id,
      targetAsset: new Stock("ARKK"),
      buyingConditions: [],
      sellingConditions: [],
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
    const amount = Allocation.calculateQuantityToBuy(
      strategy.targetAsset,
      map,
      strategy.buyAmount,
      10000,
      [],
      { fillAt: FillProbabilityEnum.NEAR_UNLIKELY_TO_FILL }
    );
    expect(Math.floor(amount)).toBe(8);
  });

  test("Testing the get targetAsset method in strategy", async () => {
    const strategyObj: IStrategy = {
      name: "ARKK Buy Low Sell High",
      userId: user.id,
      targetAsset: new Stock("ARKK"),
      buyingConditions: [],
      sellingConditions: [],
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
    let targetAsset = strategy.targetAsset;
    let compared = new Stock("ARKK");
    expect(targetAsset).toStrictEqual(compared);
  });

  test("Testing the get targetAsset method in strategy", async () => {
    const strategyObj: IStrategy = {
      name: "ARKK Buy Low Sell High",
      userId: user.id,
      targetAsset: new Stock("ARKK"),
      buyingConditions: [],
      sellingConditions: [],
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
    strategy.targetAsset = new Stock("ARKG");
    let compared = new Stock("ARKG");
    let targetAsset = strategy.targetAsset;
    expect(targetAsset).toStrictEqual(compared);
  });
});
