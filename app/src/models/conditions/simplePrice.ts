import { compare } from "../../utils";
import {
  AssetTypeEnum,
  BidAskEnum,
  Comparator,
  ConditionEnum,
} from "../../utils/enums";
import AssetFactory, { AbstractAsset, NullAsset } from "../asset";
import FormControl from "../field/formControl";
import FormGroup from "../field/formGroup";
import NumberField from "../field/number";
import SelectField from "../field/select";
import AbstractCondition, { IsConditionTrue } from "./abstract";

interface ISimplePriceCondition {
  targetPrice: number;
  comparator: Comparator;
  targetAsset?: AbstractAsset;
  bidAskEnum?: BidAskEnum;
}

class SimplePriceCondition
  extends AbstractCondition
  implements ISimplePriceCondition
{
  public type = ConditionEnum.SimplePriceCondition;
  public description = "Price is at a certain value";
  public example = "If COIN is below $200/share, ...";
  public targetPrice: number = null;
  public comparator: Comparator = null;
  // if targetAsset is null, use the strategy's targetAsset
  public targetAsset?: AbstractAsset = null;
  public bidAskEnum?: BidAskEnum = null;

  constructor(obj: ISimplePriceCondition) {
    super({ ...obj, type: ConditionEnum.SimplePriceCondition });
    this.targetPrice = obj.targetPrice;
    this.comparator = obj.comparator;
    if (obj.targetAsset) {
      this.targetAsset = AssetFactory.create(obj.targetAsset);
    } else {
      this.targetAsset = new NullAsset();
    }
    this.bidAskEnum = obj.bidAskEnum || BidAskEnum.MID;
  }

  public toString() {
    const supes = super.toString();
    return `${supes} | Target Price: ${this.targetPrice}, Inequality Trigger: ${this.comparator}`;
  }

  // returns true if current price is (comparator) target price
  public async isTrue(args: IsConditionTrue): Promise<boolean> {
    const { priceMap, strategy } = args;
    const currentPrice = priceMap.getStockPrice(
      this.targetAsset.type === AssetTypeEnum.NONE
        ? strategy.targetAsset
        : this.targetAsset,
      this.bidAskEnum
    );
    return compare(currentPrice, this.targetPrice, this.comparator);
  }

  public getForm(): FormControl {
    const formControl = super.getForm();
    formControl.addGroup(
      FormGroup.targetAsset(this.targetAsset, { required: false })
    );
    formControl.addGroup(
      new FormGroup([
        new NumberField(
          {
            name: "targetPrice",
            label: "Target Price",
            helperText: "The price to compare against",
            value: this.targetPrice,
          },
          0,
          10000
        ),
      ])
    );
    formControl.addGroup(
      new FormGroup([
        new SelectField(Object.values(Comparator), {
          value: this.comparator,
          name: "comparator",
          label: "Comparator",
          helperText:
            "Returns true if current price is (comparator) target price",
        }),
      ])
    );
    formControl.addGroup(
      new FormGroup([
        new SelectField(Object.values(BidAskEnum), {
          name: "bidAskEnum",
          label: "Bid, Mid, or Ask",
          helperText: "Whether to use the bid, mid, or ask price",
          value: this.bidAskEnum,
        }),
      ])
    );
    return formControl;
  }
}

export default SimplePriceCondition;
