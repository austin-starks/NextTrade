import {
  DeploymentEnum,
  FillProbabilityEnum,
  OrderTypeEnum,
  PercentOrDollarsEnum,
} from "../../utils/enums";
import { Id } from "../abstractions/abstractModel";
import { AllocationLimit } from "../allocation";
import { IPosition } from "../position";
import { IStrategy } from "../strategy";

export const PAPER_CONFIG_BACKTEST: Readonly<ITradingConfig> = {
  orderType: OrderTypeEnum.MARKET,
  commission: {
    stockCommission: { val: 0.005, type: PercentOrDollarsEnum.PERCENT },
    cryptoCommission: { val: 0.01, type: PercentOrDollarsEnum.PERCENT },
    optionCommission: { val: 0.02, type: PercentOrDollarsEnum.PERCENT },
  },
  fillAt: FillProbabilityEnum.MID,
};

export const PAPER_CONFIG_DEFAULT: Readonly<ITradingConfig> = {
  orderType: OrderTypeEnum.LIMIT,
  commission: {
    stockCommission: { val: 0, type: PercentOrDollarsEnum.DOLLARS },
    optionCommission: { val: 0, type: PercentOrDollarsEnum.DOLLARS },
    cryptoCommission: { val: 0.01, type: PercentOrDollarsEnum.PERCENT },
  },
  fillAt: FillProbabilityEnum.MID,
};

export const LIVE_CONFIG_DEFAULT: Readonly<ITradingConfig> = {
  orderType: OrderTypeEnum.LIMIT,
  commission: {
    stockCommission: { val: 0, type: PercentOrDollarsEnum.DOLLARS },
    optionCommission: { val: 0, type: PercentOrDollarsEnum.DOLLARS },
    cryptoCommission: { val: 0, type: PercentOrDollarsEnum.PERCENT },
  },
  fillAt: FillProbabilityEnum.MID,
};

export interface IComparisionHistory {
  time: Date;
  value: number;
  position: IPosition;
  buyingPower: number;
}

export interface IPortfolio {
  _id?: Id;
  version?: number;
  userId: Id;
  name: string;
  initialValue: number;
  buyingPower?: number;
  liveTradeConfig?: ITradingConfig;
  paperConfig?: ITradingConfig;
  main?: boolean;
  deployment?: DeploymentEnum;
  active?: boolean;
  positions?: IPosition[];
  maximumAllocation?: AllocationLimit;
  minimumAllocation?: AllocationLimit;
  strategies?: IStrategy[];
}

export interface ICommissionVal {
  type: PercentOrDollarsEnum;
  val: number;
}

export interface ICommission {
  stockCommission: ICommissionVal;
  optionCommission: ICommissionVal;
  cryptoCommission: ICommissionVal;
}

export interface ITradingConfig {
  commission: ICommission;
  orderType: OrderTypeEnum;
  fillAt: FillProbabilityEnum;
}
