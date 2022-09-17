import ConditionFactory from ".";
import { ConditionEnum } from "../../utils";
import AbstractCondition, { ICondition, IsConditionTrue } from "./abstract";

export interface ICompoundCondition extends ICondition {
  conditions?: AbstractCondition[];
}

class CompoundCondition
  extends AbstractCondition
  implements ICompoundCondition
{
  public conditions: AbstractCondition[] = [];
  type: ConditionEnum;
  description: string;
  example: string;
  isTrue(args: IsConditionTrue): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  constructor(obj: ICompoundCondition) {
    super({ ...obj });
    if (obj && obj.conditions && obj.conditions.length) {
      this.conditions = ConditionFactory.createFromArray(obj.conditions);
    }
  }

  public generateId() {
    super.generateId();
    for (let i = 0; i < this.conditions.length; i++) {
      let condition = this.conditions[i];
      condition._id = this._id;
    }
  }

  public add(condition: AbstractCondition) {
    this.conditions.push(condition);
  }

  public addAll(conditions: AbstractCondition[]) {
    const promises = [];
    for (let i = 0; i < conditions.length; i++) {
      let promise = this.add(conditions[i]);
      promises.push(promise);
    }
  }
}

export default CompoundCondition;
