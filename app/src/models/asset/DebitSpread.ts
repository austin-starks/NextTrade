import {
  AssetTypeEnum,
  OptionTypeEnum,
  StrikePriceEnum,
} from "../../utils/enums";
import AbstractAsset from "./AbstractAsset";
import Option from "./Option";

export default class DebitSpread extends AbstractAsset {
  public long: Option;
  public short: Option;
  public name: string;
  public symbol: string;
  public type: AssetTypeEnum;

  constructor(long: Option, short: Option) {
    super();
    this.checkPreconditions(long, short);
    this.long = long;
    this.short = short;
    this.name = long.name;
    this.setSymbol();
    this.type = AssetTypeEnum.DEBIT_SPREAD;
  }

  public setSymbol() {
    this.symbol = `long=${this.long.symbol} | short=${this.short.symbol}`;
  }

  private checkPreconditions(long: Option, short: Option) {
    if (
      long.expirationDateConfig.closestDate !==
        short.expirationDateConfig.closestDate ||
      long.expirationDateConfig.furthestDate !==
        short.expirationDateConfig.furthestDate
    ) {
      throw new Error(
        "long and short options should have the same expiration config"
      );
    } else if (
      long.strikePriceConfig.strikeRangeType !==
        short.strikePriceConfig.strikeRangeType &&
      short.strikePriceConfig.strikeType !== StrikePriceEnum.ATM &&
      long.strikePriceConfig.strikeType !== StrikePriceEnum.ATM
    ) {
      throw new Error(
        "long and short options should have the same strike range type"
      );
    } else if (long.optionType !== short.optionType) {
      throw new Error("Debit spreads should be done with the same option type");
    } else if (
      long.strikePriceConfig.strikeRange >=
        short.strikePriceConfig.strikeRange &&
      long.optionType === OptionTypeEnum.CALL
    ) {
      throw new Error("long option should be more ITM for call debit spreads");
    } else if (
      long.strikePriceConfig.strikeRange <=
        short.strikePriceConfig.strikeRange &&
      long.optionType === OptionTypeEnum.PUT
    ) {
      throw new Error("long option should be more ITM for put debit spreads");
    } else if (long.name !== short.name) {
      throw new Error("Options should have the same names");
    }
  }

  public getClass() {
    return "multileg";
  }
}
