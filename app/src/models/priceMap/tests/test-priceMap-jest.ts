import { afterAll, afterEach, beforeAll, describe, test } from "@jest/globals";
import "dotenv/config";
import DbHandler from "../../../services/db";

const dbHandler = new DbHandler("test");

beforeAll(async () => {
  await dbHandler.connect();
});

afterEach(async () => await dbHandler.clearDatabase());

afterAll(async () => {
  await dbHandler.closeDatabase();
});

describe("Testing priceMap functionality", () => {
  test("Can detect outlier data with the priceMap", async () => {});
});
