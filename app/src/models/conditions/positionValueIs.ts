import { compare } from "../../utils";
import { Comparator, ConditionEnum } from "../../utils/enums";
import FormControl from "../field/formControl";
import FormGroup from "../field/formGroup";
import NumberField from "../field/number";
import SelectField from "../field/select";
import AbstractCondition, { IsConditionTrue } from "./abstract";

interface IPositionValueIs {
  amount: number;
  comparator: Comparator;
}

// TODO: Add a date field to this condition
class PositionValueIsCondition
  extends AbstractCondition
  implements IPositionValueIs
{
  public description = "Position value is";
  public example = "If my Position value is at least...";
  public type = ConditionEnum.PositionValueIs;
  public amount: number = 0;
  public comparator: Comparator = null;

  constructor(obj: IPositionValueIs) {
    super({ ...obj, type: ConditionEnum.PositionValueIs });
    this.amount = obj?.amount || 0;
    this.comparator = obj?.comparator || Comparator.EQUAL_TO;
  }

  public toString() {
    const supes = super.toString();
    return `${supes} | Have ${this.comparator} ${this.amount} dollars valued in this Position`;
  }

  public async isTrue(args: IsConditionTrue): Promise<boolean> {
    const { portfolio, priceMap } = args;
    return compare(
      portfolio.calculatePositionValue(priceMap),
      this.amount,
      this.comparator
    );
  }

  public getForm(): FormControl {
    const formControl = super.getForm();
    formControl.addGroup(
      new FormGroup([
        new NumberField(
          {
            name: "amount",
            label: "Amount",
            helperText:
              "Amount of cash/margin to have in Position to execute this condition",
            value: this.amount,
          },
          0,
          999999
        ),
      ])
    );
    formControl.addGroup(
      new FormGroup([
        new SelectField(Object.values(Comparator), {
          name: "comparator",
          label: "Comparator",
          helperText:
            "Returns true if current price is (comparator) target price",
          value: this.comparator,
        }),
      ])
    );
    return formControl;
  }
}

export default PositionValueIsCondition;
