export enum PrivilegeEnum {
  ADMIN = "Admin",
  USER = "User",
}

export enum StatusEnum {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  COMPLETE = "COMPLETE",
  ERROR = "ERROR",
}

export enum TimeIntervalEnum {
  DAY = "Day",
  HOUR = "Hour",
  MINUTE = "Minute",
}

export enum MarketStatusEnum {
  OPEN = "Open",
  CLOSED = "Closed",
  HALFDAY = "Halfday",
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

export enum ConditionEnum {
  AbstractCondition = "Abstract Condition",
  SimplePriceCondition = "Simple Price",
  MovingAveragePriceCondition = "Moving Average Price",
  AndCondition = "And Condition",
  ThenCondition = "Temporal Condition",
  PortfolioIsProfitable = "Is Profitable",
  HavePosition = "Have Position",
  PositionPercentChangeCondition = "Position Percent Change",
  PositionIsShort = "Is Asset Short",
  EnoughTimePassed = "Enough Time Passed",
  BuyingPowerIs = "Buying Power Is",
  PortfolioValueIs = "Portfolio Value Is",
  OrCondition = "Or Condition",
  PositionValueIs = "Position Value Is",
}

export enum OhlcEnum {
  OPEN = "open",
  HIGH = "high",
  LOW = "low",
  CLOSE = "close",
  VOLUME = "volume",
}

export enum FitnessEnum {
  percentChange = "percentChange",
  sharpe = "sharpe",
  maxDrawdown = "maxDrawdown",
  sortino = "sortino",
}

export enum StatisticsEnum {
  LOW = "low",
  MEAN = "mean",
  HIGH = "high",
}

export enum AllocationEnum {
  PERCENT_OF_PORTFOLIO = "percent of portfolio",
  PERCENT_OF_BUYING_POWER = "percent of buying power",
  PERCENT_OF_CURRENT_POSITIONS = "percent of current positions",
  DOLLARS = "dollars",
  NUM_ASSETS = "number of assets",
}

export enum FieldEnum {
  NUMBER = "number",
  TEXT = "text",
  SELECT = "select",
  DATE = "date",
}

export enum AssetTypeEnum {
  STOCK = "Stock",
  CRYPTO = "Cryptocurrency",
  OPTION = "Option",
  DEBIT_SPREAD = "Debit Spread",
  NONE = "None",
}

export enum OrderStatusEnum {
  FILLED = "Filled",
  PARTIALLY_FILLED = "Partially filled",
  CANCELED = "Canceled",
  PENDING = "Pending",
}

export enum OrderTypeEnum {
  LIMIT = "Limit Order",
  MARKET = "Market Order",
}

export enum BuyOrSellEnum {
  BUY = "buy",
  SELL = "sell",
}

export enum FillProbabilityEnum {
  LIKELY_TO_FILL = "likely to fill",
  UNLIKELY_TO_FILL = "unlikely to fill",
  MID = "mid",
  NEAR_LIKELY_TO_FILL = "near likely to fill",
  NEAR_UNLIKELY_TO_FILL = "near unlikely to fill",
}

export enum BidAskEnum {
  BID = "bid",
  MID = "mid",
  ASK = "ask",
}

export function flipFillProbabilityEnum(
  e: FillProbabilityEnum
): FillProbabilityEnum {
  switch (e) {
    case FillProbabilityEnum.LIKELY_TO_FILL:
      return FillProbabilityEnum.UNLIKELY_TO_FILL;
    case FillProbabilityEnum.UNLIKELY_TO_FILL:
      return FillProbabilityEnum.LIKELY_TO_FILL;
    case FillProbabilityEnum.MID:
      return FillProbabilityEnum.MID;
    case FillProbabilityEnum.NEAR_UNLIKELY_TO_FILL:
      return FillProbabilityEnum.NEAR_LIKELY_TO_FILL;
    case FillProbabilityEnum.NEAR_LIKELY_TO_FILL:
      return FillProbabilityEnum.NEAR_UNLIKELY_TO_FILL;
    default:
      throw new Error("Invalid FillProbabilityEnum");
  }
}

export enum BrokerageEnum {
  TRADIER = "Tradier",
  ROBINHOOD = "Robinhood",
  IB = "Interactive Brokers",
  ALPACA = "Alpaca",
  SYSTEM = "SYSTEM",
  CACHED = "CACHED",
  TEST = "test",
  TEST_WITH_MARKET_HISTORY_SPY = "test_with_market_history_spy",
  COINBASE = "Coinbase",
}

export enum DeploymentEnum {
  PAPER = "paper-trading",
  LIVE = "live-trading",
}

export enum Comparator {
  LESS_THAN = "less than",
  GREATER_THAN = "greater than",
  LESS_THAN_OR_EQUAL_TO = "less than or equal to",
  GREATER_THAN_OR_EQUAL_TO = "greater than or equal to",
  EQUAL_TO = "equal to",
}

export enum TimeEnum {}

export enum DateEnum {
  LESS_THAN_ONE_WEEK = 0,
  ONE_WEEK = 7,
  TWO_WEEKS = 14,
  THREE_WEEKS = 21,
  ONE_MONTH = 30,
  TWO_MONTHS = 60,
  THREE_MONTHS = 90,
  FOUR_MONTHS = 120,
  FIVE_MONTHS = 150,
  SIX_MONTHS = 180,
  SEVEN_MONTHS = 210,
  EIGHT_MONTHS = 240,
  NINE_MONTHS = 270,
  TEN_MONTHS = 300,
  ELEVEN_MONTHS = 330,
  ONE_YEAR = 365,
  TWO_YEARS = 730,
  THREE_YEARS = 1095,
}

export enum StrikePriceEnum {
  ITM = "in the money",
  OTM = "out the money",
  ATM = "at the money",
}

export enum PercentOrDollarsEnum {
  PERCENT = "percent",
  DOLLARS = "dollars",
}

export enum ExpirationPreferenceEnum {
  CLOSE = "closest",
  MID = "middle",
  FAR = "furthest",
}

export enum OptionTypeEnum {
  CALL = "Call",
  PUT = "Put",
}
