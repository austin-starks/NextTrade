import _ from "lodash";
import { compare } from "../../utils";
import { Comparator, ConditionEnum } from "../../utils/enums";
import AssetFactory, { AbstractAsset } from "../asset";
import FormControl from "../field/formControl";
import FormGroup from "../field/formGroup";
import NumberField from "../field/number";
import SelectField from "../field/select";
import AbstractCondition, { IsConditionTrue } from "./abstract";

interface IPositionPercentChangeCondition {
  percentChange: number;
  targetAssets: Array<AbstractAsset>;
  comparator: Comparator;
}

class PositionPercentChangeCondition
  extends AbstractCondition
  implements IPositionPercentChangeCondition
{
  public description =
    "Returns true if currentPercentChange is (comparator) the targetPercentChange";
  public example = "If my SPY and QQQ stocks have changed by 10% or more, ...";
  public type = ConditionEnum.PositionPercentChangeCondition;
  public targetAssets: Array<AbstractAsset> = [];
  public percentChange: number = null;
  public comparator: Comparator = null;

  constructor(obj: IPositionPercentChangeCondition) {
    super({ ...obj, type: ConditionEnum.PositionPercentChangeCondition });
    this.percentChange = obj.percentChange;
    if (obj.targetAssets) {
      this.targetAssets = obj.targetAssets
        .filter((asset) => !_.isNil(asset))
        .map((asset) => AssetFactory.create(asset));
    }
    this.comparator = obj.comparator;
  }

  public toString() {
    const supes = super.toString();
    const assetStr = this.targetAssets
      .map((asset) => asset.symbol)
      .reduce((curr, acc) => `${curr} & ${acc}`, "");
    return `${supes} | Current positions (${assetStr}) are ${this.comparator} ${this.percentChange}%`;
  }

  private getFinalResult(currentPercentChange: number) {
    const percentChange = this.percentChange / 100;
    return compare(currentPercentChange, percentChange, this.comparator);
  }

  public async isTrue(args: IsConditionTrue): Promise<boolean> {
    // returns true if currentPercentChange is <Comparator> the targetPercentChange
    const { portfolio, priceMap } = args;

    // get the portfolio by its ID
    // portfolio.positions => positions in the portfolio
    // positions [{name: "DRIV", type: "Stock", avgPrice: 27, quantity: 7}]
    // priceMap: {"DRIV": 19}

    let whatIBought = 0;
    let whatItsWorth = 0;
    const positions = portfolio.positions;
    for (let i = 0; i < positions.length; i++) {
      let currentPosition = positions[i];
      for (let j = 0; j < this.targetAssets.length; j++) {
        let targetAsset = this.targetAssets[j];
        if (
          currentPosition.name === targetAsset.name &&
          currentPosition.type === targetAsset.type
        ) {
          // calculate the total amount of money you spent on these positions
          whatIBought += currentPosition.averageCost * currentPosition.quantity;
          // how much these positions are worth now
          let price = priceMap.getPositionPrice(currentPosition);
          whatItsWorth += price * currentPosition.quantity;
        }
      }
    }
    let currentPercentChange = (whatItsWorth - whatIBought) / whatIBought;
    return this.getFinalResult(currentPercentChange);
  }

  getForm(): FormControl {
    const formControl = super.getForm();
    formControl.addGroup(FormGroup.targetAssets(this.targetAssets));
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
    formControl.addGroup(
      new FormGroup([
        new NumberField(
          {
            name: "percentChange",
            label: "Percent Change",
            helperText: "Target percent change. 10 is 10% (or 0.1x)",
            value: this.percentChange,
          },
          -100,
          200
        ),
      ])
    );
    return formControl;
  }
}

export default PositionPercentChangeCondition;
