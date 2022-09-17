import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
} from "@jest/globals";
import { Allocation, AllocationLimit, PurchaseAndSaleAllocation } from "../";
import DbHandler from "../../../services/db";
import {
  AllocationEnum,
  AssetTypeEnum,
  BuyOrSellEnum,
  FillProbabilityEnum,
} from "../../../utils/enums";
import AssetFactory from "../../asset";
import Position from "../../position";
import PriceMap from "../../priceMap";

const dbHandler: DbHandler = new DbHandler("test");

beforeAll(async () => {
  await dbHandler.connect();
});

afterEach(async () => await dbHandler.clearDatabase());

afterAll(async () => {
  await dbHandler.closeDatabase();
});

describe("Allocation tests", () => {
  test("calcPositionValue returns the value that you expect for stocks", async () => {
    const iobj = {
      name: "AAPL",
      type: AssetTypeEnum.STOCK,
      symbol: "AAPL",
      quantity: 2,
      lastPrice: 120.4,
    };
    const position = new Position(iobj);

    const priceobj = {
      bid: 120.36,
      mid: 120.4,
      ask: 120.44,
      open: 119.9,
      high: 121.1,
      low: 119.1,
      close: 119.12,
    };
    const map: PriceMap = new PriceMap();
    map.set("AAPL", priceobj);
    const answer = Allocation.calcPositionValue([position], map);
    expect(answer).toEqual(240.8);
  });

  test("calcPositionValue returns the value that you expect for options", async () => {
    const iobj = {
      name: "AAPL",
      symbol: "AAPL210716C00129210",
      type: AssetTypeEnum.OPTION,
      quantity: 5,
      lastPrice: 2.22,
    };
    const position = new Position(iobj);

    const priceobj = {
      bid: 2.2,
      mid: 2.22,
      ask: 2.24,
      open: 2.56,
      high: 2.9,
      low: 1.76,
      close: 2.28,
    };
    const map: PriceMap = new PriceMap();
    map.set("AAPL210716C00129210", priceobj);
    const answer = Allocation.calcPositionValue([position], map);
    expect(answer).toEqual(1110.0);
  });

  test("test to see tradeLimitReached functionality for dollars: total current is greater than max amount", async () => {
    const iobj = {
      name: "AAPL",
      symbol: "AAPL",
      type: AssetTypeEnum.STOCK,
      quantity: 2,
      lastPrice: 90.0,
    };
    const position = new Position(iobj);
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
    map.set("AAPL", priceobj);

    const allocationObj = {
      type: AllocationEnum.DOLLARS,
      amount: 200,
    };
    const bool = AllocationLimit.buyLimitReached(
      allocationObj,
      1000,
      [position],
      map
    );
    expect(bool).toEqual(true);
  });
  test("test to see tradeLimitReached functionality for dollars: max allocation is high and our position value is smaller than limit", async () => {
    const iobj = {
      name: "AAPL",
      symbol: "AAPL",
      type: AssetTypeEnum.STOCK,
      quantity: 2,
      lastPrice: 120.4,
    };
    const position = new Position(iobj);
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
    map.set("AAPL", priceobj);

    const allocationObj = {
      type: AllocationEnum.DOLLARS,
      amount: 300,
    };
    const bool = AllocationLimit.buyLimitReached(
      allocationObj,
      1000,
      [position],
      map
    );
    expect(bool).toEqual(false);
  });

  test("tradeLimitReached functionality for PERCENT_OF_PORTFOLIO: max allocation is 50% and we currently have less", async () => {
    const iobj = {
      name: "AAPL",
      type: AssetTypeEnum.STOCK,
      symbol: "AAPL",
      quantity: 2,
      lastPrice: 125,
    };
    const position = new Position(iobj);
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
    map.set("AAPL", priceobj);

    const allocationObj = {
      type: AllocationEnum.PERCENT_OF_PORTFOLIO,
      amount: 50,
    };
    const bool = AllocationLimit.buyLimitReached(
      allocationObj,
      241,
      [position],
      map
    );
    expect(bool).toEqual(false);
  });

  test("tradeLimitReached functionality for PERCENT_OF_PORTFOLIO: max allocation is 50% and we currently have more", async () => {
    const iobj = {
      name: "AAPL",
      type: AssetTypeEnum.STOCK,
      symbol: "AAPL",
      quantity: 2,
      lastPrice: 125,
    };
    const position = new Position(iobj);
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
    map.set("AAPL", priceobj);

    const allocationObj = {
      type: AllocationEnum.PERCENT_OF_PORTFOLIO,
      amount: 50,
    };
    const bool = AllocationLimit.buyLimitReached(
      allocationObj,
      239,
      [position],
      map
    );
    expect(bool).toEqual(true);
  });

  test("tradeLimitReached functionality for PERCENT_OF_BUYING_POWER: throws an error", async () => {
    const iobj = {
      name: "AAPL",
      type: AssetTypeEnum.STOCK,
      symbol: "AAPL",
      quantity: 1,
      lastPrice: 95,
    };
    const position = new Position(iobj);
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
    map.set("AAPL", priceobj);

    const allocationObj = {
      type: AllocationEnum.PERCENT_OF_BUYING_POWER,
      amount: 50,
    };
    let bool: any;
    try {
      bool = AllocationLimit.buyLimitReached(
        allocationObj,
        475,
        [position],
        map
      );
    } catch (e) {
      bool = e;
    }
    expect(bool).toBeInstanceOf(Error);
  });

  test("tradeLimitReached functionality for NUM_ASSETS: max allocation is 1 and we currently hold 2", async () => {
    const iobj = {
      name: "AAPL",
      type: AssetTypeEnum.STOCK,
      symbol: "AAPL",
      quantity: 2,
      lastPrice: 95,
    };
    const position = new Position(iobj);
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
    map.set("AAPL", priceobj);

    const allocationObj = {
      type: AllocationEnum.NUM_ASSETS,
      amount: 1,
    };
    const bool = AllocationLimit.buyLimitReached(
      allocationObj,
      241,
      [position],
      map
    );
    expect(bool).toEqual(true);
  });

  test("tradeLimitReached functionality for NUM_ASSETS: max allocation is 4 and we currently hold 2", async () => {
    const iobj = {
      name: "AAPL",
      type: AssetTypeEnum.STOCK,
      symbol: "AAPL",
      quantity: 2,
      lastPrice: 95,
    };
    const position = new Position(iobj);
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
    map.set("AAPL", priceobj);

    const allocationObj = {
      type: AllocationEnum.NUM_ASSETS,
      amount: 4,
    };
    const bool = AllocationLimit.buyLimitReached(
      allocationObj,
      241,
      [position],
      map
    );
    expect(bool).toEqual(false);
  });

  test("tradeLimitReached functionality for PERCENT_OF_PORTFOLIO: current portfolio is greater than the min", async () => {
    const iobj = {
      name: "AAPL",
      type: AssetTypeEnum.STOCK,
      symbol: "AAPL",
      quantity: 2,
      lastPrice: 95,
    };
    const position = new Position(iobj);
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
    map.set("AAPL", priceobj);

    const allocationObj = {
      type: AllocationEnum.PERCENT_OF_PORTFOLIO,
      amount: 50,
    };
    const bool = AllocationLimit.buyLimitReached(
      allocationObj,
      241,
      [position],
      map
    );
    expect(bool).toEqual(false);
  });

  test("tradeLimitReached functionality for PERCENT_OF_PORTFOLIO: current portfolio is less than the min", async () => {
    const iobj = {
      name: "AAPL",
      type: AssetTypeEnum.STOCK,
      symbol: "AAPL",
      quantity: 2,
      lastPrice: 95,
    };
    const position = new Position(iobj);
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
    map.set("AAPL", priceobj);

    const allocationObj = {
      type: AllocationEnum.PERCENT_OF_PORTFOLIO,
      amount: 50,
    };
    const bool = AllocationLimit.buyLimitReached(
      allocationObj,
      239,
      [position],
      map
    );
    expect(bool).toEqual(true);
  });

  test("tradeLimitReached functionality for DOLLARS: current stock holdings is more than min allocation amount", async () => {
    const iobj = {
      name: "AAPL",
      type: AssetTypeEnum.STOCK,
      symbol: "AAPL",
      quantity: 1,
      lastPrice: 95,
    };
    const position = new Position(iobj);
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
    map.set("AAPL", priceobj);

    const allocationObj = {
      type: AllocationEnum.DOLLARS,
      amount: 119,
    };
    const bool = AllocationLimit.buyLimitReached(
      allocationObj,
      101,
      [position],
      map
    );
    expect(bool).toEqual(true);
  });

  test("tradeLimitReached functionality for DOLLARS: current stock holdings is less than min allocation amount", async () => {
    const iobj = {
      name: "AAPL",
      type: AssetTypeEnum.STOCK,
      symbol: "AAPL",
      quantity: 2,
      lastPrice: 95,
    };
    const position = new Position(iobj);
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
    map.set("AAPL", priceobj);

    const allocationObj = {
      type: AllocationEnum.DOLLARS,
      amount: 241,
    };
    const bool = AllocationLimit.buyLimitReached(
      allocationObj,
      101,
      [position],
      map
    );
    expect(bool).toEqual(false);
  });

  test("tradeLimitReached functionality for NUM ASSETS: current stock holdings is greater than min allocation amount", async () => {
    const iobj = {
      name: "AAPL",
      type: AssetTypeEnum.STOCK,
      symbol: "AAPL",
      quantity: 5,
      lastPrice: 95,
    };
    const position = new Position(iobj);
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
    map.set("AAPL", priceobj);

    const allocationObj = {
      type: AllocationEnum.NUM_ASSETS,
      amount: 6,
    };
    const bool = AllocationLimit.buyLimitReached(
      allocationObj,
      101,
      [position],
      map
    );
    expect(bool).toEqual(false);
  });

  test("tradeLimitReachedc functionality for DEFAULT: allocation maps to default", async () => {
    const iobj = {
      name: "AAPL",
      type: AssetTypeEnum.STOCK,
      symbol: "AAPL",
      quantity: 2,
      lastPrice: 95,
    };
    const position = new Position(iobj);
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
    map.set("AAPL", priceobj);

    const allocationObj = {
      type: "random" as any,
      amount: 4,
    };
    let bool: any;
    try {
      bool = AllocationLimit.buyLimitReached(
        allocationObj,
        241,
        [position],
        map
      );
      expect(1).toEqual(2);
    } catch (e) {
      bool = e;
    }
    expect(bool).toStrictEqual(
      new Error("Invalid Allocation Type for Allocation Limit: random")
    );
  });

  test("PurchaseAndSaleAllocation functionality for PERCENT_OF_PORTFOLIO", async () => {
    const iobj = {
      name: "AAPL",
      type: AssetTypeEnum.STOCK,
      symbol: "AAPL",
      quantity: 5,
      lastPrice: 95,
    };
    const position = new Position(iobj);
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
    map.set("AAPL", priceobj);

    const allocationObj = {
      type: AllocationEnum.PERCENT_OF_PORTFOLIO,
      amount: 50,
    };
    const num = PurchaseAndSaleAllocation.calculateNumShares(
      allocationObj,
      600,
      [position],
      map,
      AssetFactory.createFromPosition(position),
      BuyOrSellEnum.BUY,
      FillProbabilityEnum.MID
    );
    expect(num).toEqual(5);
  });

  test("PurchaseAndSaleAllocation functionality for PERCENT_CURRENT_POSITIONS", async () => {
    const iobj = {
      name: "AAPL",
      type: AssetTypeEnum.STOCK,
      symbol: "AAPL",
      quantity: 5,
      lastPrice: 95,
    };
    const position = new Position(iobj);
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
    map.set("AAPL", priceobj);

    const iobj2 = {
      name: "MSFT",
      symbol: "MSFT",
      type: AssetTypeEnum.STOCK,
      quantity: 3,
      lastPrice: 95,
    };
    const position2 = new Position(iobj2);
    const priceobj2 = {
      bid: 199.96,
      mid: 200.0,
      ask: 200.04,
      open: 198.9,
      high: 201.1,
      low: 198.1,
      close: 199.12,
    };
    map.set("MSFT", priceobj2);
    const allocationObj = {
      type: AllocationEnum.PERCENT_OF_CURRENT_POSITIONS,
      amount: 50,
    };
    const num = PurchaseAndSaleAllocation.calculateNumShares(
      allocationObj,
      600,
      [position, position2],
      map,
      AssetFactory.createFromPosition(position2),
      BuyOrSellEnum.SELL,
      FillProbabilityEnum.MID
    );
    expect(num).toEqual(3);
  });

  test("PurchaseAndSaleAllocation functionality for PERCENT_OF_BUYING_POWER", async () => {
    const iobj = {
      name: "AAPL",
      type: AssetTypeEnum.STOCK,
      symbol: "AAPL",
      quantity: 5,
      lastPrice: 95,
    };
    const position = new Position(iobj);
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
    map.set("AAPL", priceobj);

    const allocationObj = {
      type: AllocationEnum.PERCENT_OF_BUYING_POWER,
      amount: 10,
    };
    const num = PurchaseAndSaleAllocation.calculateNumShares(
      allocationObj,
      6000,
      [position],
      map,
      AssetFactory.createFromPosition(position),
      BuyOrSellEnum.BUY,
      FillProbabilityEnum.MID
    );
    expect(num).toEqual(5);
  });

  test("PurchaseAndSaleAllocation functionality for PERCENT_OF_BUYING_POWER", async () => {
    const iobj = {
      name: "AAPL",
      type: AssetTypeEnum.STOCK,
      symbol: "AAPL",
      quantity: 5,
      lastPrice: 95,
    };
    const position = new Position(iobj);
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
    map.set("AAPL", priceobj);

    const allocationObj = {
      type: AllocationEnum.DOLLARS,
      amount: 6000,
    };
    const num = PurchaseAndSaleAllocation.calculateNumShares(
      allocationObj,
      6000,
      [position],
      map,
      AssetFactory.createFromPosition(position),
      BuyOrSellEnum.BUY,
      FillProbabilityEnum.MID
    );
    expect(num).toEqual(50);
  });

  test("PurchaseAndSaleAllocation functionality for PERCENT_OF_BUYING_POWER", async () => {
    const iobj = {
      name: "AAPL",
      type: AssetTypeEnum.STOCK,
      symbol: "AAPL",
      quantity: 5,
      lastPrice: 95,
    };
    const position = new Position(iobj);
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
    map.set("AAPL", priceobj);

    const allocationObj = {
      type: AllocationEnum.NUM_ASSETS,
      amount: 10,
    };
    const num = PurchaseAndSaleAllocation.calculateNumShares(
      allocationObj,
      6000,
      [position],
      map,
      AssetFactory.createFromPosition(position),
      BuyOrSellEnum.SELL,
      FillProbabilityEnum.MID
    );
    expect(num).toEqual(10);
  });

  test("PurchaseAndSaleAllocation functionality for NUM_ASSETS: allocation maps to default", async () => {
    const iobj = {
      name: "AAPL",
      type: AssetTypeEnum.STOCK,
      symbol: "AAPL",
      quantity: 2,
      lastPrice: 95,
    };
    const position = new Position(iobj);
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
    map.set("AAPL", priceobj);

    const allocationObj = {
      type: "DUMMY" as any,
      amount: 4,
    };
    let bool: any;
    try {
      bool = PurchaseAndSaleAllocation.calculateNumShares(
        allocationObj,
        241,
        [position],
        map,
        AssetFactory.createFromPosition(position),
        BuyOrSellEnum.BUY,
        FillProbabilityEnum.MID
      );
      expect(1).toEqual(2);
    } catch (e) {
      bool = e;
    }
    expect(bool.message).toContain("Invalid Allocation");
  });
  // and purchase and sale allocation use case
});
