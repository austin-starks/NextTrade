import {
  IAction,
  IStatistics,
  StatusEnum,
  TimeIntervalEnum,
} from "../../services/outsideInterfaces";
import { MockPortfolio } from "../Portfolios/interface";

export interface IBacktest {
  _id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  portfolio: MockPortfolio;
  interval: TimeIntervalEnum;
  failedBuyHistory: Array<IAction>;
  successfulBuyHistory: Array<IAction>;
  successfulSellHistory: Array<IAction>;
  err: String[];
  status: StatusEnum;
  statistics: IStatistics;
  createdAt: Date;
  updatedAt: Date;
}
