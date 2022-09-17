import { ConditionEnum } from "../../utils/enums";
import FormControl from "../field/formControl";
import FormGroup from "../field/formGroup";
import NumberField from "../field/number";
import AbstractCondition, { IsConditionTrue } from "./abstract";

interface IIsProfitable {
  percentProfit: number;
}

// TODO: Add a date field to this condition
class IsProfitableCondition extends AbstractCondition implements IIsProfitable {
  public description = "Portfolio is profitable";
  public example =
    "If my portfolio is profitable from the start (+5% of initial value), ...";
  public type = ConditionEnum.PortfolioIsProfitable;
  public percentProfit: number = null;

  constructor(obj?: IIsProfitable) {
    super({ ...obj, type: ConditionEnum.PortfolioIsProfitable });
    this.percentProfit = obj?.percentProfit || 0;
  }

  public toString() {
    const supes = super.toString();
    return `${supes} | Percent Profitable From Start: ${this.percentProfit}`;
  }

  public async isTrue(args: IsConditionTrue): Promise<boolean> {
    const { portfolio, priceMap } = args;
    const value = portfolio.calculateValue(priceMap);
    const initialValue = portfolio.initialValue;
    const additionalDollars = (this.percentProfit / 100) * initialValue;
    return Promise.resolve(value > initialValue + additionalDollars);
  }

  public getForm(): FormControl {
    const formControl = super.getForm();
    formControl.addGroup(
      new FormGroup([
        new NumberField(
          {
            name: "percentProfit",
            label: "Percent profitable",
            helperText:
              "Portfolio's value must be this percent more than its initial value. 0% is break-even, 100% is 100% more (or 2x)",
            value: this.percentProfit,
          },
          -100,
          100
        ),
      ])
    );
    return formControl;
  }

  static IsOnePercentProfitable(): IsProfitableCondition {
    const c = new IsProfitableCondition({
      percentProfit: 1,
    });
    c.name = "Is One Percent Profitable";
    return c;
  }
}

export default IsProfitableCondition;
