import {
  DeploymentEnum,
  IPosition,
  timestamp,
} from "../../services/outsideInterfaces";
import { IStrategy } from "../Strategies/interface";

export interface AbstractPortfolio {
  _id: string;
  userId: string;
  name: string;
  initialValue: number;
  buyingPower: number;
  positions: IPosition[];
  main?: boolean;
  createdAt?: string;
  strategies?: IStrategy[];
  active: boolean;
  deployment: DeploymentEnum;
  commissionPaid?: number;
}

export interface MockPortfolio extends AbstractPortfolio {
  valueHistory: timestamp[];
  comparisonHistory: timestamp[];
}

export interface IPortfolio {
  name: string;
  main: boolean;
  initialValue?: number;
  active?: boolean;
  deployment?: DeploymentEnum;
}
