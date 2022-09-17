import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
} from "@jest/globals";
import "dotenv/config";
import date from "date-and-time";
import DbHandler from "../../../../services/db";
import { BrokerageEnum } from "../../../../utils/enums";
import { BacktestBrokerage, TestBrokerage } from "../..";
import { formatDate, MarketDataArray } from "../../../../utils";
import { Stock } from "../../../asset";
import DataTransformerBacktestBrokerage from "..";

const dbHandler = new DbHandler("test");

beforeAll(async () => {
  await dbHandler.connect();
});

afterEach(async () => await dbHandler.clearDatabase());

afterAll(async () => {
  await dbHandler.closeDatabase();
});

describe("Data Transformer Tests", () => {
  test("Data transformer transforms data from brokerage", async () => {
    const startDate = new Date("2021-03-01");
    const endDate = new Date("2021-03-02");
    const brokerage = new TestBrokerage({
      name: BrokerageEnum.TEST,
      authDetails: null,
    });
    const marketData: MarketDataArray = [
      {
        date: "2021-02-28",
        open: 100,
        close: 110,
        high: 111,
        low: 100,
        volume: 10000,
      },
      {
        date: "2021-03-01",
        open: 111,
        close: 113,
        high: 115,
        low: 108,
        volume: 10000,
      },
      {
        date: "2021-03-02",
        open: 112,
        close: 110,
        high: 130,
        low: 110,
        volume: 11000,
      },
      {
        date: "2021-03-05",
        open: 110,
        close: 111,
        high: 120,
        low: 107,
        volume: 12000,
      },
    ];
    brokerage.constructRealisticMarketDict(new Stock("NVDA"), marketData);
    const backtestBrokerage = new BacktestBrokerage({ brokerage });
    await backtestBrokerage.getMarketHistory(
      new Stock("NVDA"),
      "2021-02-28",
      new Date("2021-03-05")
    );
    const transformer = new DataTransformerBacktestBrokerage(
      backtestBrokerage,
      { ratio: 100, meanDeviationValue: 0 },
      { startDate, endDate }
    );
    expect(transformer.getMarketHistoryCache.get("NVDA").result.length).toBe(
      marketData.length
    );
  });
});
