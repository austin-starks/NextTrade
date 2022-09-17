import date from "date-and-time";
import AssetFactory from ".";
import { Datestring } from "../../utils";
import {
  AssetTypeEnum,
  DateEnum,
  ExpirationPreferenceEnum,
  OptionTypeEnum,
  PercentOrDollarsEnum,
  StrikePriceEnum,
} from "../../utils/enums";
import { AbstractBrokerage } from "../brokerage";
import Portfolio from "../portfolio";
import Strategy from "../strategy";
import AbstractAsset from "./AbstractAsset";
import DebitSpread from "./DebitSpread";

export interface OptionChainItem {
  symbol: string;
  description: string;
  greeks?: any;
  strike: number;
  option_type: string;
  expiration_date: Datestring;
}

export type OptionChain = OptionChainItem[];

export class StrikePriceConfig {
  public strikeType: StrikePriceEnum;
  public strikeRange: number;
  public strikeRangeType: PercentOrDollarsEnum;

  constructor(
    strikeType = StrikePriceEnum.OTM,
    strikeRange = 0.2,
    strikeRangeType = PercentOrDollarsEnum.PERCENT
  ) {
    this.strikeType = strikeType;
    this.strikeRange = strikeRange;
    this.strikeRangeType = strikeRangeType;
  }

  public static createATMstrike() {
    return new StrikePriceConfig(StrikePriceEnum.ATM);
  }

  public static createOTMstrike(amount: number, metric?: PercentOrDollarsEnum) {
    let perOrDol: PercentOrDollarsEnum = null;
    if (!metric && amount < 1) {
      perOrDol = PercentOrDollarsEnum.PERCENT;
    }
    if (!metric && amount >= 1) {
      perOrDol = PercentOrDollarsEnum.DOLLARS;
    }
    if (metric) {
      perOrDol = metric;
    }
    return new StrikePriceConfig(StrikePriceEnum.OTM, amount, perOrDol);
  }

  public static createITMStrike() {
    return new StrikePriceConfig(StrikePriceEnum.ITM);
  }
}

export class ExpirationConfig {
  public closestDate: DateEnum;
  public furthestDate: DateEnum;
  public preference: ExpirationPreferenceEnum;

  constructor(
    closestDate = DateEnum.TWO_MONTHS,
    furthestDate = DateEnum.ONE_YEAR,
    preference = ExpirationPreferenceEnum.MID
  ) {
    this.closestDate = closestDate;
    this.furthestDate = furthestDate;
    this.preference = preference;
  }

  public static createWeeklyConfig(): ExpirationConfig {
    return new ExpirationConfig(
      DateEnum.ONE_WEEK,
      DateEnum.TWO_MONTHS,
      ExpirationPreferenceEnum.MID
    );
  }

  public static createMonthlyConfig(): ExpirationConfig {
    return new ExpirationConfig(
      DateEnum.TWO_MONTHS,
      DateEnum.FOUR_MONTHS,
      ExpirationPreferenceEnum.MID
    );
  }

  public static createLeapConfig(): ExpirationConfig {
    return new ExpirationConfig(
      DateEnum.EIGHT_MONTHS,
      DateEnum.TWO_YEARS,
      ExpirationPreferenceEnum.CLOSE
    );
  }
}

export interface OptionConfig {
  strikePriceConfig: StrikePriceConfig;
  expirationDateConfig: ExpirationConfig;
  optionType: OptionTypeEnum;
}

const initialOptionsConfig: OptionConfig = {
  expirationDateConfig: new ExpirationConfig(),
  strikePriceConfig: new StrikePriceConfig(),
  optionType: OptionTypeEnum.CALL,
};

export default class Option extends AbstractAsset {
  public strikePriceConfig: StrikePriceConfig;
  public expirationDateConfig: ExpirationConfig;
  public optionType: OptionTypeEnum;
  public strikePrice: number;
  public expiration: Datestring;
  public name: string;
  public type: AssetTypeEnum;
  public symbol: string;

  constructor(name: string, config = initialOptionsConfig) {
    super();
    // if name has number, name is everything until the first num
    this.name = name ? name.toUpperCase() : undefined;
    this.type = AssetTypeEnum.OPTION;
    this.strikePriceConfig = config.strikePriceConfig;
    this.expirationDateConfig = config.expirationDateConfig;
    this.optionType = config.optionType;
    this.strikePrice = null;
    this.expiration = null;
    this.symbol = null;
  }

  public getClass() {
    return "option";
  }

  private findDateClosestTo(
    date: Date,
    expirationArray: Array<Datestring>
  ): Datestring {
    let difference = Number.MAX_SAFE_INTEGER;
    let result = expirationArray[0];
    for (let i = 1; i < expirationArray.length; i++) {
      let tempDif = Math.abs(
        new Date(expirationArray[i]).getTime() - date.getTime()
      );
      if (tempDif < difference) {
        difference = tempDif;
        result = expirationArray[i];
      }
    }
    return result;
  }

  private findDateRightBefore(
    date: Date,
    expirationArray: Array<Datestring>
  ): Datestring {
    for (let i = expirationArray.length - 1; i > -1; i--) {
      let expiration = expirationArray[i];
      if (date > new Date(expiration)) {
        return expiration;
      }
    }
    return expirationArray[expirationArray.length - 1];
  }

  private findDateRightAfter(
    date: Date,
    expirationArray: Array<Datestring>
  ): Datestring {
    for (let i = 0; i < expirationArray.length; i++) {
      let expiration = expirationArray[i];
      if (date < new Date(expiration)) {
        return expiration;
      }
    }
    return expirationArray[0];
  }

  public getExpiration(expirationArray: Array<Datestring>): Datestring {
    let today = new Date();
    const { closestDate, furthestDate } = this.expirationDateConfig;
    let closeDateBound = date.addDays(today, closestDate);
    let furthestDateBound = date.addDays(today, furthestDate);
    switch (this.expirationDateConfig.preference) {
      case ExpirationPreferenceEnum.CLOSE:
        return this.findDateRightAfter(closeDateBound, expirationArray);
      case ExpirationPreferenceEnum.FAR:
        return this.findDateRightBefore(furthestDateBound, expirationArray);
      case ExpirationPreferenceEnum.MID:
        const differenceInDays = Math.round((furthestDate - closestDate) / 2);
        const between = date.addDays(closeDateBound, differenceInDays);
        return this.findDateClosestTo(between, expirationArray);
      default:
        throw new Error("Invalid Expiration Config");
    }
  }

  public getStrikePriceFromConfig(midPrice: number): number {
    // // if it's ITM
    // // // if it's a call, do price - strikeRange*price or price - strikeRange
    // // // if it's a put, do price + strikeRange*price or price + strikeRange
    // // // return mid price
    // // if it's OTM
    // // // if it's a call, do price + strikeRange*price or price + strikeRange
    // // // if it's a put, do price - strikeRange*price or price - strikeRange
    // // // return mid price
    let optionType = this.optionType;
    let { strikeRange, strikeRangeType, strikeType } = this.strikePriceConfig;
    let result = midPrice;
    let dif: number =
      strikeRangeType === PercentOrDollarsEnum.DOLLARS
        ? strikeRange
        : midPrice * strikeRange;
    if (strikeType === StrikePriceEnum.ITM) {
      result = optionType === OptionTypeEnum.CALL ? result - dif : result + dif;
    } else if (strikeType === StrikePriceEnum.OTM) {
      result = optionType === OptionTypeEnum.PUT ? result - dif : result + dif;
    }
    return result;
  }

  public findSymbolClosestToStrike(
    targetStrike: number,
    optionType: OptionTypeEnum,
    optionChain: OptionChain
  ) {
    let minimum = Number.MAX_SAFE_INTEGER - 1;
    let symbol = "";
    let dif = Number.MAX_SAFE_INTEGER;
    for (let i = 0; i < optionChain.length; i++) {
      if (optionChain[i].option_type === optionType) {
        dif = Math.abs(optionChain[i].strike - targetStrike);
        if (dif < minimum) {
          minimum = dif;
          symbol = optionChain[i].symbol;
        }
      }
    }
    return symbol;
  }

  public static isExpired(asset: AbstractAsset, expirationDate: Date): boolean {
    if (asset.type === AssetTypeEnum.OPTION) {
      return new Date((asset as Option).expiration) > expirationDate;
    }
    return false;
  }

  public async getSymbolInfoFromBrokerage(brokerage: AbstractBrokerage) {
    const expirationArr = await brokerage.getOptionExpirationList(this);
    const expirationStr = this.getExpiration(expirationArr);
    const optionChain = await brokerage.getOptionChain(this, expirationStr);
    const priceObj = await brokerage.getStockPriceObj(this);
    const targetStrike = this.getStrikePriceFromConfig(priceObj.mid);
    const symbol = this.findSymbolClosestToStrike(
      targetStrike,
      this.optionType,
      optionChain
    );
    this.symbol = symbol;
    this.strikePrice = targetStrike;
    this.expiration = expirationStr;
  }

  public static async getOptionsSymbols(
    strategies: Strategy[],
    brokerage: AbstractBrokerage
  ) {
    for (let i = 0; i < strategies.length; i++) {
      let strategy = strategies[i];
      let targetAsset = strategy.targetAsset;
      const [newAsset, isOption] = await this.getOptionSymbol(
        targetAsset,
        brokerage
      );
      if (isOption) {
        strategy.targetAsset = newAsset;
        await strategy.save();
      }
    }
  }

  public static async getOptionSymbol(
    targetAsset: AbstractAsset,
    brokerage: AbstractBrokerage
  ): Promise<[AbstractAsset, boolean]> {
    if (targetAsset.type === AssetTypeEnum.OPTION) {
      let option = AssetFactory.create(targetAsset) as Option;
      await option.getSymbolInfoFromBrokerage(brokerage);
      return [option, true];
    }
    if (targetAsset.type === AssetTypeEnum.DEBIT_SPREAD) {
      let ds = AssetFactory.create(targetAsset) as DebitSpread;
      await ds.long.getSymbolInfoFromBrokerage(brokerage);
      await ds.short.getSymbolInfoFromBrokerage(brokerage);
      ds.setSymbol();
      return [ds, true];
    }
    return [targetAsset, false];
  }

  public static async expireOptions(portfolios: Portfolio[]) {
    for (let i = 0; i < portfolios.length; i++) {
      portfolios[i].deleteExpiredOptions();
      await portfolios[i].save();
    }
  }
}
