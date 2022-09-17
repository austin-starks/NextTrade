import ConditionFactory from ".";
import { ConditionEnum, TimeIntervalEnum } from "../../utils/enums";
import { AbstractAsset } from "../asset";
import FormControl from "../field/formControl";
import FormGroup from "../field/formGroup";
import NumberField from "../field/number";
import SelectField from "../field/select";
import { Duration } from "../time";
import { IsConditionTrue } from "./abstract";
import CompoundCondition, { ICompoundCondition } from "./compound";

interface IThenCondition extends ICompoundCondition {
  history?: Date[];
  duration: Duration;
}

export class ThenCondition extends CompoundCondition implements IThenCondition {
  public description = "Conditions must be true sequentially";
  public example =
    "If asset is profitable then the portfolio value is less than $9000, ...";
  public type = ConditionEnum.ThenCondition;
  public duration: Duration = null;
  public history: Date[] = [];

  constructor(obj?: IThenCondition) {
    super({ ...obj, type: ConditionEnum.ThenCondition });
    if (obj && obj.conditions && obj.conditions.length) {
      this.conditions = ConditionFactory.createFromArray(obj.conditions);
    }
    if (obj.duration) {
      this.duration = new Duration(obj.duration.number, obj.duration.unit);
    }
    if (obj.history) {
      this.history = obj.history;
    }
  }

  public isExpired(currentTime: Date): boolean {
    if (!this.duration) {
      return false;
    }
    if (this.history.length === 0) {
      return false;
    }
    const expirationTime = Duration.getDateTime(this.history[0], this.duration);
    return currentTime < expirationTime;
  }

  public async isTrue(args: IsConditionTrue): Promise<boolean> {
    if (this.isExpired(args.currentTime)) {
      this.history = [];
    }
    for (let i = this.history.length; i < this.conditions.length; i++) {
      let condition = this.conditions[i];
      let isTrue = await condition.isTrue(args);
      if (!isTrue) {
        this.wasTrue = false;
        return Promise.resolve(false);
      }
      this.history.push(args.currentTime);
    }
    this.wasTrue = true;
    return Promise.resolve(true);
  }

  public toString() {
    const conditionString: string = this.conditions
      .map((condition) => condition.toString())
      .reduce(
        (acc, cur) => `${acc}\n  - ${cur}`,
        "Condition: ThenCondition:\n  - "
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
    const expirationGroup = new FormGroup();
    expirationGroup.addField(
      new NumberField(
        {
          label: "Expiration Time",
          name: "duration.number",
          helperText:
            "Length of time from the first condition's trigger until the condition resets",
          value: this.duration?.number,
        },
        0,
        365
      )
    );
    expirationGroup.addField(
      new SelectField(Object.values(TimeIntervalEnum), {
        label: "Expiration Unit",
        name: "duration.unit",
        helperText: "Unit of time (hour, day, etc.)",
        value: this.duration?.unit,
      })
    );
    formControl.addGroup(expirationGroup);
    return formControl;
  }
}

export default ThenCondition;
