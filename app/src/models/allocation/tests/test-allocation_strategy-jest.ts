import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
} from "@jest/globals";
import { Allocation, PurchaseAndSaleAllocation } from "..";
import DbHandler from "../../../services/db";
import { AllocationEnum, FillProbabilityEnum } from "../../../utils/enums";
import { Stock } from "../../asset";
import PriceMap from "../../priceMap";
import Strategy, { IStrategy } from "../../strategy";

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
    const map = new PriceMap();
    const priceobj = {
      bid: 120.36,
      mid: 120.4,
      ask: 120.44,
      open: 119.9,
      high: 121.1,
      low: 119.1,
      close: 119.12,
    };
    map.set("AAPL", priceobj);
    const strategyObj: IStrategy = {
      name: "ARKK Buy Low Sell High",
      userId: "uniqueId" as any,
      targetAsset: new Stock("AAPL"),
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
    expect(
      Math.floor(
        Allocation.calculateQuantityToBuy(
          strategy.targetAsset,
          map,
          strategy.buyAmount,
          10000,
          [],
          { fillAt: FillProbabilityEnum.NEAR_LIKELY_TO_FILL }
        )
      )
    ).toEqual(16);

    // 0 because you do not have any positions
    expect(
      Math.floor(
        Allocation.calculateQuantityToSell(
          strategy.targetAsset,
          map,
          strategy.sellAmount,
          10000,
          [],
          { fillAt: FillProbabilityEnum.NEAR_LIKELY_TO_FILL }
        )
      )
    ).toEqual(0);
  });
});
