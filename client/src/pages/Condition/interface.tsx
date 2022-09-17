import { IFormControl } from "../../services/outsideInterfaces";

export enum ConditionEnum {
  AbstractCondition = "Abstract Condition",
  AndCondition = "And Condition",
  OrCondition = "Or Condition",
  ThenCondition = "Temporal Condition",
}

export interface AbstractCondition {
  conditions?: AbstractCondition[];
  _id?: string;
  name: string;
  type: ConditionEnum;
  example: string;
  description: string;
  wasTrue: boolean;
  form: IFormControl;
}

export interface CompoundCondition extends AbstractCondition {
  conditions: AbstractCondition[];
}
