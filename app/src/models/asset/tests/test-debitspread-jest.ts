import { describe, expect, test } from "@jest/globals";
import AssetFactory, {
  DebitSpread,
  ExpirationConfig,
  Option,
  OptionConfig,
  StrikePriceConfig,
} from "..";
import {
  DateEnum,
  ExpirationPreferenceEnum,
  OptionTypeEnum,
} from "../../../utils/enums";

describe("Debit spread tests", () => {
  test("Can create a debit spread", async () => {
    const weeklyConfig = new ExpirationConfig(
      DateEnum.TWO_WEEKS,
      DateEnum.TWO_MONTHS,
      ExpirationPreferenceEnum.CLOSE
    );
    const lconfig: OptionConfig = {
      expirationDateConfig: weeklyConfig,
      strikePriceConfig: StrikePriceConfig.createATMstrike(),
      optionType: OptionTypeEnum.CALL,
    };
    const long = new Option("TSLA", lconfig);

    const sconfig: OptionConfig = {
      expirationDateConfig: weeklyConfig,
      strikePriceConfig: StrikePriceConfig.createOTMstrike(30),
      optionType: OptionTypeEnum.CALL,
    };
    const short = new Option("TSLA", sconfig);
    const debitSpread = new DebitSpread(long, short);
    expect(debitSpread.name.includes(long.name)).toEqual(true);
    expect(debitSpread.name.includes(short.name)).toEqual(true);
  });

  test("Cannot create a debit spread with mismatching expiration", async () => {
    const weeklyConfig = new ExpirationConfig(
      DateEnum.TWO_WEEKS,
      DateEnum.TWO_MONTHS,
      ExpirationPreferenceEnum.CLOSE
    );
    const lconfig: OptionConfig = {
      expirationDateConfig: weeklyConfig,
      strikePriceConfig: StrikePriceConfig.createATMstrike(),
      optionType: OptionTypeEnum.CALL,
    };
    const long = new Option("TSLA", lconfig);

    const sconfig: OptionConfig = {
      expirationDateConfig: ExpirationConfig.createLeapConfig(),
      strikePriceConfig: StrikePriceConfig.createOTMstrike(30),
      optionType: OptionTypeEnum.CALL,
    };
    const short = new Option("TSLA", sconfig);
    try {
      new DebitSpread(long, short);
    } catch (e) {
      expect(e).not.toEqual(null);
    }
  });

  test("Cannot create a debit spread with mismatching option types", async () => {
    const weeklyConfig = new ExpirationConfig(
      DateEnum.TWO_WEEKS,
      DateEnum.TWO_MONTHS,
      ExpirationPreferenceEnum.CLOSE
    );
    const lconfig: OptionConfig = {
      expirationDateConfig: weeklyConfig,
      strikePriceConfig: StrikePriceConfig.createATMstrike(),
      optionType: OptionTypeEnum.CALL,
    };
    const long = new Option("TSLA", lconfig);

    const sconfig: OptionConfig = {
      expirationDateConfig: weeklyConfig,
      strikePriceConfig: StrikePriceConfig.createOTMstrike(30),
      optionType: OptionTypeEnum.PUT,
    };
    const short = new Option("TSLA", sconfig);
    try {
      new DebitSpread(long, short);
    } catch (e) {
      expect(e).not.toEqual(null);
    }
  });

  test("Cannot create a debit spread with mismatching option names", async () => {
    const weeklyConfig = new ExpirationConfig(
      DateEnum.TWO_WEEKS,
      DateEnum.TWO_MONTHS,
      ExpirationPreferenceEnum.CLOSE
    );
    const lconfig: OptionConfig = {
      expirationDateConfig: weeklyConfig,
      strikePriceConfig: StrikePriceConfig.createATMstrike(),
      optionType: OptionTypeEnum.CALL,
    };
    const long = new Option("TSLA", lconfig);

    const sconfig: OptionConfig = {
      expirationDateConfig: weeklyConfig,
      strikePriceConfig: StrikePriceConfig.createOTMstrike(30),
      optionType: OptionTypeEnum.CALL,
    };
    const short = new Option("AMZN", sconfig);
    try {
      new DebitSpread(long, short);
    } catch (e) {
      expect(e).not.toEqual(null);
    }
  });

  test("Can create a debit spread from factory ", async () => {
    const weeklyConfig = new ExpirationConfig(
      DateEnum.TWO_WEEKS,
      DateEnum.TWO_MONTHS,
      ExpirationPreferenceEnum.CLOSE
    );
    const lconfig: OptionConfig = {
      expirationDateConfig: weeklyConfig,
      strikePriceConfig: StrikePriceConfig.createATMstrike(),
      optionType: OptionTypeEnum.CALL,
    };
    const long = new Option("TSLA", lconfig);

    const sconfig: OptionConfig = {
      expirationDateConfig: weeklyConfig,
      strikePriceConfig: StrikePriceConfig.createOTMstrike(30),
      optionType: OptionTypeEnum.CALL,
    };
    const short = new Option("TSLA", sconfig);
    const ds = new DebitSpread(long, short);
    const factoried = AssetFactory.create(ds) as DebitSpread;
    expect(factoried.long.optionType).toEqual(OptionTypeEnum.CALL);
  });
});
