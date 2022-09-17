import { cloneDeep, round } from "lodash";
import {
  Datestring,
  MarketDataArray,
  MarketDataPoint,
  randomBoxMueller,
} from "../../../utils";
import { BacktestBrokerage } from "..";

export interface IGeneratedData {
  ratio: number;
  meanDeviationValue: number;
}

interface IMeanObject {
  openToHigh: { mean: number; sd: number; values: number[] };
  openToLow: { mean: number; sd: number; values: number[] };
  openToClose: { mean: number; sd: number; values: number[] };
  closeToOpen: { mean: number; sd: number; values: number[] };
  n: number;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

class DataTransformerBacktestBrokerage extends BacktestBrokerage {
  constructor(
    brokerage: BacktestBrokerage,
    generatedData: IGeneratedData,
    range: DateRange
  ) {
    super(brokerage);
    this.getMarketHistoryCache = this.generateMockData(generatedData, range);
  }

  generateMockData(obj: IGeneratedData, range: DateRange) {
    const { meanDeviationValue, ratio } = obj;
    if (ratio < Math.random() * 100) {
      return this.getMarketHistoryCache;
    }
    const marketHistory = new Map(this.getMarketHistoryCache);
    if (!marketHistory?.size) {
      throw new Error("Market history cannot be empty");
    }
    const assets = marketHistory.keys();
    for (const asset of assets) {
      let history = marketHistory.get(asset);
      history.result = this.transform(
        history.result,
        meanDeviationValue,
        range
      );
      marketHistory.set(asset, history);
    }
    return marketHistory;
  }

  getMeanObject(
    history: MarketDataArray,
    meanDeviationValue: number,
    range: DateRange
  ): IMeanObject {
    const { startDate, endDate } = range;
    const meanObject = {
      openToHigh: { mean: 0, sd: 0, values: [] },
      openToLow: { mean: 0, sd: 0, values: [] },
      openToClose: { mean: 0, sd: 0, values: [] },
      closeToOpen: { mean: 0, sd: 0, values: [] },
      n: 0,
    };
    let currentDate = cloneDeep(startDate);
    let index = history.findIndex(
      (v) => currentDate.getTime() <= new Date(v.date).getTime()
    );
    while (index < history.length && currentDate <= endDate) {
      const currentPrices = history[index];
      meanObject.openToHigh.mean +=
        (currentPrices["high"] - currentPrices["open"]) / currentPrices["open"];
      meanObject.openToLow.mean +=
        (currentPrices["low"] - currentPrices["open"]) / currentPrices["open"];
      meanObject.openToClose.mean +=
        (currentPrices["close"] - currentPrices["open"]) / currentPrices["low"];
      meanObject.openToHigh.values.push(
        (currentPrices["high"] - currentPrices["open"]) / currentPrices["open"]
      );
      meanObject.openToLow.values.push(
        (currentPrices["low"] - currentPrices["open"]) / currentPrices["open"]
      );
      meanObject.openToClose.values.push(
        (currentPrices["close"] - currentPrices["open"]) / currentPrices["low"]
      );
      meanObject.n += 1;
      const lastClose = currentPrices["close"];
      index += 1;
      currentDate = new Date(currentPrices.date);
      meanObject.closeToOpen.mean +=
        (currentPrices["open"] - lastClose) / lastClose;
      meanObject.closeToOpen.values.push(
        (currentPrices["open"] - lastClose) / lastClose
      );
    }
    meanObject.openToHigh.mean /= meanObject.n;
    meanObject.openToLow.mean /= meanObject.n;
    meanObject.openToClose.mean /= meanObject.n;
    meanObject.closeToOpen.mean /= meanObject.n;
    meanObject.openToHigh.sd = Math.sqrt(
      meanObject.openToHigh.values
        .map((x) => Math.pow(x - meanObject.openToHigh.mean, 2))
        .reduce((a, b) => a + b, 0) / meanObject.n
    );
    meanObject.openToLow.sd = Math.sqrt(
      meanObject.openToLow.values
        .map((x) => Math.pow(x - meanObject.openToLow.mean, 2))
        .reduce((a, b) => a + b, 0) / meanObject.n
    );
    meanObject.openToClose.sd = Math.sqrt(
      meanObject.openToClose.values
        .map((x) => Math.pow(x - meanObject.openToClose.mean, 2))
        .reduce((a, b) => a + b, 0) / meanObject.n
    );
    meanObject.closeToOpen.sd = Math.sqrt(
      meanObject.closeToOpen.values
        .map((x) => Math.pow(x - meanObject.closeToOpen.mean, 2))
        .reduce((a, b) => a + b, 0) / meanObject.n
    );
    meanObject.openToClose.mean += meanDeviationValue / 2;
    meanObject.closeToOpen.mean += meanDeviationValue / 2;
    return meanObject;
  }

  transform(
    history: MarketDataArray,
    meanDeviationValue: number,
    range: DateRange
  ): MarketDataArray {
    const meanObject = this.getMeanObject(history, meanDeviationValue, range);
    return this.constructHistory(history, range, meanObject);
  }

  constructHistory(
    history: MarketDataArray,
    range: DateRange,
    meanObject: IMeanObject
  ): MarketDataArray {
    const { startDate, endDate } = range;
    let currentDate = cloneDeep(startDate);
    let index = history.findIndex(
      (v) => currentDate.getTime() <= new Date(v.date).getTime()
    );
    let prevPrices = history[index];
    index += 1;
    while (index < history.length && currentDate <= endDate) {
      const currentPrices = this.generatePriceObj(
        prevPrices,
        meanObject,
        history[index].date as Datestring,
        history[index].volume
      );
      history[index] = currentPrices;
      index += 1;
      currentDate = new Date(currentPrices.date);
      prevPrices = currentPrices;
    }
    return history;
  }

  generatePriceObj(
    prevPrices: MarketDataPoint,
    meanObject: IMeanObject,
    date: Datestring,
    volume: number
  ): MarketDataPoint {
    const newPrice = { ...prevPrices };
    newPrice.volume = volume;
    newPrice.date = date;
    // generate data by drawing from a normal distribution
    newPrice.open = round(
      prevPrices.close +
        prevPrices.close *
          randomBoxMueller(
            meanObject.closeToOpen.mean,
            meanObject.closeToOpen.sd
          ),
      2
    );
    newPrice.close = round(
      newPrice.open +
        prevPrices.open *
          randomBoxMueller(
            meanObject.openToClose.mean,
            meanObject.openToClose.sd
          ),
      2
    );
    newPrice.high = round(
      newPrice.open +
        prevPrices.open *
          randomBoxMueller(
            meanObject.openToHigh.mean,
            meanObject.openToHigh.sd
          ),
      2
    );
    newPrice.low = round(
      newPrice.open +
        prevPrices.open *
          randomBoxMueller(meanObject.openToLow.mean, meanObject.openToLow.sd),
      2
    );
    return newPrice;
  }
}

export default DataTransformerBacktestBrokerage;
