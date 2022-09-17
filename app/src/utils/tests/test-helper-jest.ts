import { describe, expect, test } from "@jest/globals";
import { formatDate, getMonthYearString, sleep } from "..";

describe("Helper tests", () => {
  test("Testing formatDate", () => {
    const d = new Date("Jan 1, 2018");
    expect(formatDate(d)).toEqual("2018-01-01");
    const d2 = new Date("12-28-2020");
    expect(formatDate(d2)).toEqual("2020-12-28");
  });

  test("Testing getMonthYearString", () => {
    const d = new Date("Jan 1, 2018");
    expect(getMonthYearString(d)).toEqual("01-2018");
    const d2 = new Date("12-28-2020");
    expect(getMonthYearString(d2)).toEqual("12-2020");
  });

  test("Testing sleep", async () => {
    const d = new Date();
    await sleep(500);
    const d2 = new Date();
    const diff = Math.abs((d as any) - (d2 as any));
    expect(diff).toBeGreaterThanOrEqual(500);
  });
});
