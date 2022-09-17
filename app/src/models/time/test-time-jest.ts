import { describe, test } from "@jest/globals";
import Time from ".";
import { TimeIntervalEnum } from "../../utils";

describe("Testing time functionality", () => {
  test("Can get the correct datetime at start of day ", async () => {
    const time = new Time(TimeIntervalEnum.DAY);
    const d = new Date("01-01-2020");
    expect(time.getDateTime(d).getHours()).toBe(9);
    expect(time.getDateTime(d).getMinutes()).toBe(30);
  });
  test("Can get the correct datetime at end of day", async () => {
    const time = new Time(TimeIntervalEnum.DAY);
    time.next();
    const d = new Date("01-01-2020");
    expect(time.getDateTime(d).getHours()).toBe(16);
    expect(time.getDateTime(d).getMinutes()).toBe(0);
    expect(time.getDateTime(d).getDate()).toBe(1);
    expect(d.getDate()).toBe(1);
  });
});
