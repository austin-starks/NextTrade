import date from "date-and-time";
import _ from "lodash";
import { compare, Datestring, formatDate, MarketDataArray } from "../../utils";
import {
  AssetTypeEnum,
  BidAskEnum,
  Comparator,
  ConditionEnum,
  OhlcEnum,
  StatisticsEnum,
  TimeIntervalEnum,
} from "../../utils/enums";
import AssetFactory, { AbstractAsset, NullAsset } from "../asset";
import { AbstractBrokerage } from "../brokerage";
import FormControl from "../field/formControl";
import FormGroup from "../field/formGroup";
import NumberField from "../field/number";
import SelectField from "../field/select";
import { Duration } from "../time";
import AbstractCondition, { IsConditionTrue } from "./abstract";

interface IHistoricalTargetPriceCondition {
  standardDeviation: number;
  duration: Duration;
  ohlc: OhlcEnum;
  statisticalMethod: StatisticsEnum;
  comparator: Comparator;
  bidAskEnum?: BidAskEnum;
  targetAsset?: AbstractAsset;
}

class MovingAveragePriceCondition
  extends AbstractCondition
  implements IHistoricalTargetPriceCondition
{
  public description =
    "Asset's price is at some point relative to its moving average price.";
  public example =
    "If COIN's price is less than or equal to 2 standard deviations below it's 5-day mean price, ...";
  public type = ConditionEnum.MovingAveragePriceCondition;
  public standardDeviation: number = null;
  public ohlc: OhlcEnum = null;
  public statisticalMethod: StatisticsEnum = null;
  public comparator: Comparator = null;
  public bidAskEnum?: BidAskEnum = null;
  // if targetAsset is null, use the strategy's targetAsset
  public targetAsset?: AbstractAsset = null;
  public duration: Duration = null;

  constructor(obj: IHistoricalTargetPriceCondition) {
    super({ ...obj, type: ConditionEnum.MovingAveragePriceCondition });
    this.comparator = obj.comparator;
    this.standardDeviation = obj.standardDeviation;
    this.ohlc = obj.ohlc;
    this.statisticalMethod = obj.statisticalMethod;
    this.bidAskEnum = obj.bidAskEnum || BidAskEnum.MID;
    if (obj.targetAsset) {
      this.targetAsset = AssetFactory.create(obj.targetAsset);
    } else {
      this.targetAsset = new NullAsset();
    }
    if (obj.duration) {
      this.duration = new Duration(
        -Math.abs(obj.duration.number),
        obj.duration.unit
      );
    } else {
      this.duration = null;
    }
  }

  public static PriceIsNotTooHigh() {
    const condition = new MovingAveragePriceCondition({
      comparator: Comparator.LESS_THAN_OR_EQUAL_TO,
      standardDeviation: 2,
      ohlc: OhlcEnum.OPEN,
      statisticalMethod: StatisticsEnum.MEAN,
      duration: new Duration(5, TimeIntervalEnum.DAY),
    });
    condition.name =
      "Price is not more than 2 standard deviations above the 5-day mean price.";
    return condition;
  }

  public toString() {
    const supes = super.toString();
    const { standardDeviation, duration, ohlc, statisticalMethod } = this;
    const { number, unit } = duration;
    return `${supes} | Current price is ${standardDeviation} standard deviations ${this.comparator} the ${number} ${unit} ${statisticalMethod} ${ohlc} price.`;
  }

  private minOrMaxOhlcPrice(
    arr: Array<Object>,
    ohlc: OhlcEnum,
    func: (x: number, y: number) => number
  ) {
    let result =
      func === Math.min ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER;
    for (let i = 0; i < arr.length; i++) {
      result = func(arr[i][ohlc], result);
    }
    return result;
  }

  private async calculateTargetPrice(
    brokerage: AbstractBrokerage,
    asset: AbstractAsset,
    currentTime: Date
  ): Promise<number> {
    const { standardDeviation, ohlc, statisticalMethod, duration } = this;
    // history starts from 9:30AM of the correct day
    const history = await this.getHistory(brokerage, asset, currentTime);
    const newDate = Duration.getDateTime(currentTime, duration);
    const historyLength = history.length;
    let startIdx =
      _.sortedIndexBy(
        history,
        {
          date: newDate.toString(),
          low: 0,
          close: 0,
          high: 0,
          open: 0,
          volume: 0,
        },
        (dp) => new Date(dp.date)
      ) - 1;
    startIdx = startIdx < 0 ? 0 : startIdx;
    const subArray = history.slice(startIdx, historyLength);
    const mean =
      subArray.reduce((acc, v) => acc + v[ohlc], 0) / subArray.length;
    const n = subArray.length;
    const standardDev = Math.sqrt(
      subArray
        .map((x) => Math.pow(x[ohlc] - mean, 2))
        .reduce((a, b) => a + b, 0) / n
    );

    // take the mean, low, or high (StatisticsEnum) of the subArray.
    switch (statisticalMethod) {
      case StatisticsEnum.HIGH:
        // take the highest ohlc price from the subArray
        return (
          this.minOrMaxOhlcPrice(subArray, ohlc, Math.max) +
          standardDeviation * standardDev
        );
      case StatisticsEnum.LOW:
        // take the lowest ohlc price from the subArray
        return (
          this.minOrMaxOhlcPrice(subArray, ohlc, Math.min) +
          standardDeviation * standardDev
        );
      case StatisticsEnum.MEAN:
        return mean + standardDeviation * standardDev;
      default:
        throw new Error("statisticalMethod does not exist");
    }
  }

  public async getHistory(
    brokerage: AbstractBrokerage,
    asset: AbstractAsset,
    currentTime: Date
  ) {
    let history: MarketDataArray;
    let pastDate: Datestring;
    switch (this.duration.unit) {
      case TimeIntervalEnum.DAY:
        pastDate = formatDate(
          date.addDays(currentTime, this.duration.number - 1)
        ) as Datestring;
        history = await brokerage.getMarketHistory(
          asset,
          pastDate,
          currentTime
        );
        return history;
      case TimeIntervalEnum.HOUR:
        pastDate = formatDate(
          date.addHours(currentTime, this.duration.number - 1)
        );
        history = await brokerage.getIntradayMarketHistory(
          asset.symbol,
          pastDate,
          currentTime,
          "15min"
        );
        return history;
      case TimeIntervalEnum.MINUTE:
        pastDate = formatDate(
          date.addMinutes(currentTime, this.duration.number - 1)
        );
        history = await brokerage.getIntradayMarketHistory(
          asset.symbol,
          pastDate,
          currentTime,
          "1min"
        );
        return history;
      default:
        throw new Error("Invalid time interval for condition");
    }
  }

  // returns true if current price is (comparator) target price
  public async isTrue(args: IsConditionTrue): Promise<boolean> {
    const { strategy, brokerage, priceMap, currentTime } = args;
    const asset =
      this.targetAsset.type === AssetTypeEnum.NONE
        ? strategy.targetAsset
        : this.targetAsset;
    const currentPrice = priceMap.getStockPrice(asset, this.bidAskEnum);
    // returns true if current price is x the targetPrice
    let targetPrice = await this.calculateTargetPrice(
      brokerage,
      asset,
      currentTime || new Date()
    );
    return compare(currentPrice, targetPrice, this.comparator);
  }

  public getForm(): FormControl {
    const formControl = super.getForm();
    formControl.addGroup(FormGroup.targetAsset(this.targetAsset));
    formControl.addGroup(FormGroup.duration(this.duration, -365, 365));
    formControl.addGroup(
      new FormGroup([
        new NumberField(
          {
            name: "standardDeviation",
            label: "Standard Deviations",
            helperText: "How far above the (statistical method)",
            value: this.standardDeviation,
          },
          -5,
          5
        ),
        new SelectField(Object.values(StatisticsEnum), {
          name: "statisticalMethod",
          label: "Statistical Method",
          helperText: "Calculate target price using the mean, high, or low",
          value: this.statisticalMethod,
        }),
      ])
    );
    formControl.addGroup(
      new FormGroup([
        new SelectField(Object.values(OhlcEnum), {
          name: "ohlc",
          label: "OHLCV",
          helperText: "Calculate target price using volume or OHLC price",
          value: this.ohlc,
        }),
        new SelectField(Object.values(BidAskEnum), {
          name: "bidAskEnum",
          label: "Bid, Mid, or Ask",
          helperText: "Compare to the current bid, mid, or ask price",
          value: this.bidAskEnum,
        }),
      ])
    );
    formControl.addGroup(
      new FormGroup([
        new SelectField(Object.values(Comparator), {
          name: "comparator",
          label: "Comparator",
          helperText:
            "Returns true if current price is (comparator) target price",
          value: this.comparator,
        }),
      ])
    );
    return formControl;
  }
}

export default MovingAveragePriceCondition;
