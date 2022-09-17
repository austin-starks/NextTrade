import { formatDate, MarketDataArray, TimeIntervalEnum } from "../../utils";
import { AbstractAsset } from "../asset";
import { AbstractBrokerage, BacktestBrokerage } from "../brokerage";
import { timestamp } from "./interfaces";

export interface IBaseLineComparison {
  brokerage: BacktestBrokerage;
  frequency: TimeIntervalEnum;
  comparisonAsset: AbstractAsset;
}

export default class PriceHistory {
  public async get(
    brokerage: AbstractBrokerage,
    symbol: string,
    yearsBack: number
  ): Promise<timestamp[]> {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 7);
    const distantDate = new Date();
    distantDate.setDate(distantDate.getDate() - 30 * 12 * yearsBack);
    const shortHistory = await brokerage
      .getIntradayMarketHistory(
        symbol,
        formatDate(recentDate),
        new Date(),
        "15min"
      )
      .then((res) =>
        res.map((dp) => {
          return {
            time: dp.date,
            value: dp.close,
          };
        })
      );
    const longHistory = await brokerage
      .getMarketHistory(symbol, formatDate(distantDate), recentDate)
      .then(this.convertToTimestampArray);

    return [...longHistory, ...shortHistory];
  }

  public convertToTimestampArray(history: MarketDataArray): timestamp[] {
    return history.reduce((acc, curr) => {
      const time = new Date(curr.date);
      if (curr.open) {
        time.setUTCHours(14, 30, 0, 0);
        const timestamp: timestamp = {
          time: time.toString(),
          value: curr.open,
        };
        acc.push(timestamp);
      }
      if (curr.close) {
        time.setUTCHours(21, 0, 0, 0);
        const timestamp: timestamp = {
          time: time.toString(),
          value: curr.close,
        };
        acc.push(timestamp);
      }
      return acc;
    }, []);
  }
}
