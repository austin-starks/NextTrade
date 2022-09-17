import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  test,
} from "@jest/globals";
import { Stock } from "..";
import DbHandler from "../../../services/db";
import { AllocationEnum } from "../../../utils/enums";
import { PurchaseAndSaleAllocation } from "../../allocation";
import Strategy, { IStrategy } from "../../strategy";
const dbHandler: DbHandler = new DbHandler("test");
var strategy: Strategy;
var assetName: string;

beforeAll(async () => {
  await dbHandler.connect();
});

beforeEach(async () => {
  const strategyObj: IStrategy = {
    name: "Buy Driv Option",
    userId: "uniqueId" as any,
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
  strategy = new Strategy(strategyObj);
  assetName = strategy.targetAsset.name;
});

afterEach(async () => await dbHandler.clearDatabase());

afterAll(async () => {
  await dbHandler.closeDatabase();
});

describe("Testing integration of asset and position", () => {
  test("Can create an asset array from a position array.", async () => {
    // buy an asset
    // AssetFactory.createFromPositionArray
  });
});
