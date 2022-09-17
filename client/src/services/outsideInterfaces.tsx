export type timeperiod =
  | "2D"
  | "1W"
  | "1M"
  | "3M"
  | "YTD"
  | "1Y"
  | "2Y"
  | "5Y"
  | "All";

export interface GraphTab {
  label: timeperiod;
  value: DateGraphEnum;
}

export interface IGeneratedData {
  ratio: number;
  meanDeviationValue: number;
}

export interface PositionInfo {
  name: string;
  quantity: string | number;
  price: number;
  percentChange: number;
}

export interface IFormControl {
  fields: IFormGroup[];
}

export interface IFormGroup {
  multiple: boolean;
  fields: AbstractField[];
  deletable?: boolean;
}

export interface AbstractField {
  fieldType: string;
  helperText: string;
  tooltip: string;
  name: string;
  label: string;
  required: boolean;
  values?: string[];
  value: string;
  error?: string;
}

export enum DeploymentEnum {
  PAPER = "paper-trading",
  LIVE = "live-trading",
}

export enum DateGraphEnum {
  TWO_DAYS = "2D",
  WEEK = "1W",
  MONTH = "1M",
  THREE_MONTHS = "3M",
  YTD = "YTD",
  YEAR = "1Y",
  TWO_YEARS = "2Y",
  FIVE_YEARS = "5Y",
  ALL = "ALL",
}

export type timestamp = {
  time: string;
  value: number;
  baseline?: number;
};

type Y = string;
type D = string;
type M = string;
export type Datestring = `${Y}${Y}${Y}${Y}-${M}${M}-${D}${D}`;

export enum TimeIntervalEnum {
  DAY = "Day",
  HOUR = "Hour",
  MINUTE = "Minute",
}

export enum AssetTypeEnum {
  STOCK = "Stock",
  CRYPTO = "Cryptocurrency",
  OPTION = "Option",
  FOREX = "Forex",
  DEBIT_SPREAD = "DebitSpread",
}

export enum AllocationEnum {
  PERCENT_OF_PORTFOLIO = "percent of portfolio",
  PERCENT_OF_BUYING_POWER = "percent of buying power",
  PERCENT_OF_CURRENT_POSITIONS = "percent of current positions",
  DOLLARS = "dollars",
  NUM_ASSETS = "number of assets",
}

export interface IPosition {
  name: string;
  type: AssetTypeEnum;
  quantity: number;
  lastPrice: number;
  symbol: string;
  averageCost: number;
}

export interface IAction {
  date: Datestring;
  time: string;
  data: any;
}

export interface IStatistics {
  sortino: number;
  sharpe: number;
  percentChange: number;
  totalChange: number;
  maxDrawdown: number;
  averageChange: number;
}

export enum FitnessEnum {
  percentChange = "percentChange",
  sharpe = "sharpe",
  maxDrawdown = "maxDrawdown",
  sortino = "sortino",
}

export enum StatusEnum {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  COMPLETE = "COMPLETE",
  ERROR = "ERROR",
}
