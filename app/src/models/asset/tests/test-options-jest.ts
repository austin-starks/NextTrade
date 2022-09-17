import { describe, expect, test } from "@jest/globals";
import { ExpirationConfig, Option, OptionConfig, StrikePriceConfig } from "../";
import {
  BrokerageEnum,
  DateEnum,
  ExpirationPreferenceEnum,
  OptionTypeEnum,
} from "../../../utils/enums";
import { TestBrokerage } from "../../brokerage";

const date: any = require("date-and-time");

describe("Option tests", () => {
  test("Can create a new Option with custom configs", async () => {
    const weeklyConfig = ExpirationConfig.createWeeklyConfig();
    const strikeConfig = StrikePriceConfig.createATMstrike();
    const config: OptionConfig = {
      expirationDateConfig: weeklyConfig,
      strikePriceConfig: strikeConfig,
      optionType: OptionTypeEnum.CALL,
    };
    const option = new Option("TSLA", config);
    expect(option.name).toEqual("TSLA");
  });
  test("Test expiration config for closest date preference", async () => {
    const weeklyConfig = new ExpirationConfig(
      DateEnum.TWO_WEEKS,
      DateEnum.TWO_MONTHS,
      ExpirationPreferenceEnum.CLOSE
    );
    const strikeConfig = StrikePriceConfig.createATMstrike();
    const config: OptionConfig = {
      expirationDateConfig: weeklyConfig,
      strikePriceConfig: strikeConfig,
      optionType: OptionTypeEnum.CALL,
    };
    const option = new Option("TSLA", config);
    const brokerage = new TestBrokerage({
      name: BrokerageEnum.TEST,
      authDetails: {
        token: null,
        accountId: null,
      },
    });
    const expirationArr = await brokerage.getOptionExpirationList(option);
    const expiration = new Date(option.getExpiration(expirationArr));
    let testDate = date.addDays(new Date(), 13);
    expect(expiration > testDate).toEqual(true);
    let testDate2 = date.addDays(new Date(), 21);
    expect(expiration > testDate2).toEqual(false);
  });

  test("Test expiration config for closest date preference (less than a week)", async () => {
    const weeklyConfig = new ExpirationConfig(
      DateEnum.LESS_THAN_ONE_WEEK,
      DateEnum.TWO_YEARS,
      ExpirationPreferenceEnum.CLOSE
    );
    const strikeConfig = StrikePriceConfig.createATMstrike();
    const config: OptionConfig = {
      expirationDateConfig: weeklyConfig,
      strikePriceConfig: strikeConfig,
      optionType: OptionTypeEnum.CALL,
    };
    const option = new Option("TSLA", config);
    const brokerage = new TestBrokerage({
      name: BrokerageEnum.TEST,
      authDetails: {
        token: null,
        accountId: null,
      },
    });
    const expirationArr = await brokerage.getOptionExpirationList(option);
    const expiration = new Date(option.getExpiration(expirationArr));
    let testDate = date.addDays(new Date(), 0);
    expect(expiration >= testDate).toEqual(true);
    let testDate2 = date.addDays(new Date(), 8);
    expect(expiration >= testDate2).toEqual(false);
  });

  test("Test expiration config for furthestDate preference", async () => {
    const weeklyConfig = new ExpirationConfig(
      DateEnum.TWO_MONTHS,
      DateEnum.ONE_YEAR,
      ExpirationPreferenceEnum.FAR
    );
    const strikeConfig = StrikePriceConfig.createATMstrike();
    const config: OptionConfig = {
      expirationDateConfig: weeklyConfig,
      strikePriceConfig: strikeConfig,
      optionType: OptionTypeEnum.CALL,
    };
    const option = new Option("TSLA", config);
    const brokerage = new TestBrokerage({
      name: BrokerageEnum.TEST,
      authDetails: {
        token: null,
        accountId: null,
      },
    });
    const expirationArr = await brokerage.getOptionExpirationList(option);
    const expiration = new Date(option.getExpiration(expirationArr));
    let testDate = date.addDays(new Date(), 60);
    expect(expiration >= testDate).toEqual(true);
    let testDate2 = date.addDays(new Date(), 180);
    expect(expiration >= testDate2).toEqual(true);
    let testDate3 = date.addDays(new Date(), 300);
    expect(expiration >= testDate3).toEqual(true);
    let testDate4 = date.addDays(new Date(), 370);
    expect(expiration >= testDate4).toEqual(false);
  });

  test("Test expiration config for furthestDate preference part 2", async () => {
    const weeklyConfig = new ExpirationConfig(
      DateEnum.TWO_MONTHS,
      DateEnum.ONE_YEAR,
      ExpirationPreferenceEnum.FAR
    );
    const strikeConfig = StrikePriceConfig.createATMstrike();
    const config: OptionConfig = {
      expirationDateConfig: weeklyConfig,
      strikePriceConfig: strikeConfig,
      optionType: OptionTypeEnum.CALL,
    };
    const option = new Option("TSLA", config);
    const brokerage = new TestBrokerage({
      name: BrokerageEnum.TEST,
      authDetails: {
        token: null,
        accountId: null,
      },
    });
    const expirationArr = await brokerage.getOptionExpirationList(option);
    const expiration = new Date(option.getExpiration(expirationArr));
    let testDate = date.addDays(new Date(), 60);
    expect(expiration >= testDate).toEqual(true);
    let testDate2 = date.addDays(new Date(), 180);
    expect(expiration >= testDate2).toEqual(true);
    let testDate3 = date.addDays(new Date(), 300);
    expect(expiration >= testDate3).toEqual(true);
    let testDate4 = date.addDays(new Date(), 370);
    expect(expiration >= testDate4).toEqual(false);
  });

  test("Test expiration config for mid date preference", async () => {
    const expirConfig = new ExpirationConfig(
      DateEnum.ONE_MONTH,
      DateEnum.ONE_YEAR,
      ExpirationPreferenceEnum.MID
    );
    const strikeConfig = StrikePriceConfig.createATMstrike();
    const config: OptionConfig = {
      expirationDateConfig: expirConfig,
      strikePriceConfig: strikeConfig,
      optionType: OptionTypeEnum.CALL,
    };
    const option = new Option("TSLA", config);
    const brokerage = new TestBrokerage({
      name: BrokerageEnum.TEST,
      authDetails: {
        token: null,
        accountId: null,
      },
    });
    const expirationArr = await brokerage.getOptionExpirationList(option);
    const expiration = new Date(option.getExpiration(expirationArr));
    let testDate = date.addDays(new Date(), 28);
    expect(expiration > testDate).toEqual(true);
    let testDate2 = date.addDays(new Date(), 250);
    expect(expiration > testDate2).toEqual(false);
    let testDate3 = date.addDays(new Date(), 100);
    expect(expiration > testDate3).toEqual(true);
    let testDate4 = date.addDays(new Date(), 205);
    expect(expiration > testDate4).toEqual(false);
  });

  test("Test expiration config for mid date preference part 2", async () => {
    const expirConfig = new ExpirationConfig(
      DateEnum.FOUR_MONTHS,
      DateEnum.ONE_YEAR,
      ExpirationPreferenceEnum.MID
    );
    const strikeConfig = StrikePriceConfig.createATMstrike();
    const config: OptionConfig = {
      expirationDateConfig: expirConfig,
      strikePriceConfig: strikeConfig,
      optionType: OptionTypeEnum.CALL,
    };
    const option = new Option("TSLA", config);
    const brokerage = new TestBrokerage({
      name: BrokerageEnum.TEST,
      authDetails: {
        token: null,
        accountId: null,
      },
    });
    const expirationArr = await brokerage.getOptionExpirationList(option);
    const expiration = new Date(option.getExpiration(expirationArr));
    let testDate = date.addDays(new Date(), 30);

    expect(expiration > testDate).toEqual(true);
    let testDate2 = date.addDays(new Date(), 100);
    expect(expiration > testDate2).toEqual(true);
    let testDate3 = date.addDays(new Date(), 160);
    expect(expiration > testDate3).toEqual(true);
    let testDate4 = date.addDays(new Date(), 250);
    expect(expiration > testDate4).toEqual(false);
  });

  test("Can create an options contract from mock DB", async () => {
    // const expirConfig = new ExpirationConfig(
    //   DateEnum.LESS_THAN_ONE_WEEK,
    //   DateEnum.ONE_YEAR,
    //   ExpirationPreferenceEnum.CLOSE
    // );
    // const strikeConfig = StrikePriceConfig.createATMstrike();
    // const config: OptionConfig = {
    //   expirationDateConfig: expirConfig,
    //   strikePriceConfig: strikeConfig,
    //   optionType: OptionTypeEnum.CALL
    // };
    // const option = new Option("FSLY", false, config);
    //      name: BrokerageEnum.TEST,
    // const brokerage = new TestBrokerge({
    // authDetails: "",
    // });
    // brokerage.setPrice("TSLA", 863.76);
    // expect(option.symbol).toBeFalsy();
    // await option.getSymbolInfoFromBrokerage(brokerage);
    // expect(option.symbol).not.toBeFalsy();
    // let nowDate = date.addDays(new Date(), 0);
    // expect(option.expiration).toBeGreaterThanOrEqual(nowDate);
    // let nextWeekDate = date.addDays(new Date(), 7);
    // expect(option.expiration).toBeLessThanOrEqual(nextWeekDate);
    // TODO: make expectations about the strike price
  });
  test("Cannot get option's symbol unless we construct it first", async () => {});
  test("Can create a new Option from the factory.", async () => {});
});
