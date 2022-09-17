import {
  AssetTypeEnum,
  DateGraphEnum,
  IPosition,
  PositionInfo,
  timestamp,
} from "../../services/outsideInterfaces";
import { IBacktest } from "../Backtests/interface";
import { AbstractPortfolio } from "./interface";

export interface IPositionList {
  stocks: PositionInfo[];
  options: PositionInfo[];
  cryptocurrencies: PositionInfo[];
}

export const getPositionInfo = (pos: IPosition): PositionInfo => {
  return {
    name: pos.name,
    quantity: pos.quantity,
    price: pos.lastPrice,
    percentChange: pos.lastPrice / pos.averageCost,
  };
};

export const getPositionList = (portfolio?: AbstractPortfolio) => {
  const result: IPositionList = {
    options: [],
    stocks: [],
    cryptocurrencies: [],
  };
  if (!portfolio) {
    return result;
  }
  portfolio.positions.forEach((pos) => {
    if (pos.type === AssetTypeEnum.OPTION) {
      result.options.push(getPositionInfo(pos));
    } else if (pos.type === AssetTypeEnum.STOCK) {
      result.stocks.push(getPositionInfo(pos));
    } else if (pos.type === AssetTypeEnum.CRYPTO) {
      result.cryptocurrencies.push(getPositionInfo(pos));
    }
  });
  return result;
};

export const getPortfolioValue = (portfolio?: AbstractPortfolio) => {
  if (!portfolio) {
    return 0;
  }
  const positionValue: number = portfolio.positions
    .map((p) => p.lastPrice * p.quantity)
    .reduce((acc, cur) => acc + cur, 0);
  const total: number = positionValue + portfolio.buyingPower;
  return Math.round(100 * total) / 100;
};

export interface PortfolioPageState {
  page: "backtest" | "portfolio" | "optimize";
  history: timestamp[];
  value: number;
  title: string;
  portfolio?: AbstractPortfolio;
  endHistoryDate?: Date;
  graphDates?: DateGraphEnum[];
}

export const getBacktestState = (backtest: IBacktest): PortfolioPageState => {
  const p = backtest.portfolio;
  if (p.valueHistory.length !== p.comparisonHistory.length) {
    alert("An error occured while loading the backtest");
    throw new Error("");
  }
  const result = {
    page: "backtest" as "backtest",
    value: getPortfolioValue(p),
    history: getBacktestPriceHistory(backtest),
    title: backtest.name,
    portfolio: p,
    endHistoryDate: p.valueHistory.length
      ? new Date(p.valueHistory[p.valueHistory.length - 1].time)
      : undefined,
  };
  return result;
};

export const getBacktestPriceHistory = (backtest: IBacktest) => {
  const valueHistory = backtest.portfolio.valueHistory;
  const comparisonHistory = backtest.portfolio.comparisonHistory;
  if (valueHistory.length === 0) {
    return [];
  }
  const history = valueHistory.map((dp, i) => {
    return {
      time: dp.time,
      value: dp.value,
      baseline: comparisonHistory[i].value,
    };
  });

  return history;
};
