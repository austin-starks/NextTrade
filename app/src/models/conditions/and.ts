import { ConditionEnum } from "../../utils/enums";
import { AbstractAsset } from "../asset";
import FormControl from "../field/formControl";
import FormGroup from "../field/formGroup";
import { IsConditionTrue } from "./abstract";
import CompoundCondition, { ICompoundCondition } from "./compound";

export class AndCondition
  extends CompoundCondition
  implements ICompoundCondition
{
  public description = "All conditions must be true";
  public example =
    "If asset is sold to open and the price is above the buy price, ...";
  public type = ConditionEnum.AndCondition;

  constructor(obj?: ICompoundCondition) {
    super({ ...obj, type: ConditionEnum.AndCondition });
  }

  public async isTrue(args: IsConditionTrue): Promise<boolean> {
    for (let i = 0; i < this.conditions.length; i++) {
      let condition = this.conditions[i];
      let isTrue = await condition.isTrue(args);
      if (!isTrue) {
        this.wasTrue = false;
        return Promise.resolve(false);
      }
    }
    this.wasTrue = true;
    return Promise.resolve(true);
  }

  public toString() {
    const conditionString: string = this.conditions
      .map((condition) => condition.toString())
      .reduce(
        (acc, cur) => `${acc}\n  - ${cur}`,
        "Condition: AndCondition:\n  - "
      );
    return `${conditionString}`;
  }

  public get assetFields(): {
    field: FormGroup;
    value: AbstractAsset | AbstractAsset[];
  }[] {
    const result: {
      field: FormGroup;
      value: AbstractAsset | AbstractAsset[];
    }[] = [];
    for (let i = 0; i < this.conditions.length; i++) {
      let condition = this.conditions[i];
      let assetFields = condition.assetFields;
      for (let j = 0; j < assetFields.length; j++) {
        result.push(assetFields[j]);
      }
    }
    return result;
  }

  public getForm(): FormControl {
    const formControl = super.getForm();
    return formControl;
  }
}

export default AndCondition;
