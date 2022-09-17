import {
  BuyOrSellEnum,
  ConditionEnum,
  TimeIntervalEnum,
} from "../../utils/enums";
import FormControl from "../field/formControl";
import FormGroup from "../field/formGroup";
import SelectField from "../field/select";
import { Duration } from "../time";
import AbstractCondition, { IsConditionTrue } from "./abstract";

interface IEnoughTimePassedCondition {
  side: BuyOrSellEnum;
  duration: Duration;
}

class EnoughTimePassedCondition
  extends AbstractCondition
  implements IEnoughTimePassedCondition
{
  public description = "Enough time has passed since the last buy or sell";
  public example = "If 3 days have passed since the last buy, ...";
  public type = ConditionEnum.EnoughTimePassed;
  public side: BuyOrSellEnum = null;
  public duration: Duration = null;

  constructor(obj: IEnoughTimePassedCondition) {
    super({ ...obj, type: ConditionEnum.EnoughTimePassed });
    if (obj.side) {
      this.side = obj.side;
    }
    if (obj.duration) {
      this.duration = new Duration(obj.duration.number, obj.duration.unit);
    }
  }

  public toString() {
    const supes = super.toString();
    return `${supes} | ${this.duration.number} ${this.duration.unit}s have passed since the last ${this.side}`;
  }

  public async isTrue(args: IsConditionTrue): Promise<boolean> {
    const { portfolio, currentTime } = args;
    const saleOrPurchase =
      this.side === BuyOrSellEnum.BUY
        ? portfolio.lastPurchaseDate
        : portfolio.lastSaleDate;
    const nextDate = Duration.getDateTime(
      saleOrPurchase || new Date(0),
      this.duration
    );
    return Promise.resolve(nextDate <= currentTime);
  }

  public getForm(): FormControl {
    const formControl = super.getForm();
    formControl.addGroup(
      new FormGroup([
        new SelectField(Object.values(BuyOrSellEnum), {
          name: "side",
          label: "Buy or Sell",
          helperText: "Side condition is tracking",
          value: this.side,
        }),
      ])
    );
    formControl.addGroup(FormGroup.duration(this.duration, 0, 365));
    return formControl;
  }

  static ThreeDaysPassed(): EnoughTimePassedCondition {
    const c = new EnoughTimePassedCondition({
      side: BuyOrSellEnum.BUY,
      duration: new Duration(3, TimeIntervalEnum.DAY),
    });
    c.name = "Three days passed since the last buy";
    return c;
  }
}

export default EnoughTimePassedCondition;
