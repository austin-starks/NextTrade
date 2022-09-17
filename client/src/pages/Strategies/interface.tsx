import {
  AllocationEnum,
  AssetTypeEnum,
} from "../../services/outsideInterfaces";
import { AbstractCondition } from "../Condition/interface";

export interface IStrategy {
  _id: string;
  name: string;
  userId: string;
  targetAsset: { name: string; symbol: string; type: AssetTypeEnum };
  buyAmount: { amount: number; type: AllocationEnum };
  sellAmount: { amount: number; type: AllocationEnum };
  buyingConditions: AbstractCondition[];
  sellingConditions: AbstractCondition[];
  createdAt?: string;
}
