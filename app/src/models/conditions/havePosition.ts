import _ from "lodash";
import { compare } from "../../utils";
import {
  AllocationEnum,
  AssetTypeEnum,
  Comparator,
  ConditionEnum,
} from "../../utils/enums";
import { Allocation } from "../allocation";
import AssetFactory, { AbstractAsset } from "../asset";
import FormControl from "../field/formControl";
import FormGroup from "../field/formGroup";
import SelectField from "../field/select";
import Position from "../position";
import AbstractCondition, { IsConditionTrue } from "./abstract";

interface IHavePosition {
  allocation: Allocation;
  targetAssets: AbstractAsset[];
  comparator: Comparator;
}

export default class HavePosition
  extends AbstractCondition
  implements IHavePosition
{
  public description = "Has a specified amount of a certain asset";
  public example = "If I have more than 10 of shares of GOOGL, ...";
  public type = ConditionEnum.HavePosition;
  public allocation: Allocation = null;
  public targetAssets: AbstractAsset[] = [];
  public comparator: Comparator = null;

  constructor(obj: IHavePosition) {
    super({ ...obj, type: ConditionEnum.HavePosition });
    if (obj.allocation) {
      this.allocation = new Allocation(obj.allocation);
    }

    if (obj.targetAssets) {
      this.targetAssets = obj.targetAssets
        .filter((asset) => !_.isNil(asset))
        .map((asset) => AssetFactory.create(asset));
    }
    this.comparator = obj?.comparator;
  }

  public static HaveNoPositions(assets: AbstractAsset[]) {
    const condition = new HavePosition({
      allocation: new Allocation({
        amount: 0,
        type: AllocationEnum.NUM_ASSETS,
      }),
      targetAssets: assets,
      comparator: Comparator.EQUAL_TO,
    });
    const assetStr =
      assets && assets.length
        ? assets.map((asset) => asset.name).join(", ")
        : "any asset";
    condition.name = "I have no positions of " + assetStr;
    return condition;
  }

  public static HavePosition(assets: AbstractAsset[]) {
    const condition = new HavePosition({
      allocation: new Allocation({
        amount: 0,
        type: AllocationEnum.NUM_ASSETS,
      }),
      targetAssets: assets,
      comparator: Comparator.GREATER_THAN_OR_EQUAL_TO,
    });
    const assetStr =
      assets && assets.length
        ? assets.map((asset) => asset.name).join(", ")
        : "any asset";
    condition.name = "I have some positions of " + assetStr;
    return condition;
  }

  public toString() {
    const supes = super.toString();
    const targetAssetsString = this.targetAssets
      .map((asset) => asset.name + " " + asset.type)
      .join(", ");
    return `${supes} | Have ${this.comparator} ${this.allocation.amount} ${this.allocation.type} of ${targetAssetsString}`;
  }

  public async isTrue(obj: IsConditionTrue) {
    const { priceMap, portfolio } = obj;
    // return true if currentAsset.amount <comparator> x targetAsset.amount
    const positions = [];
    const nilAsset =
      !this.targetAssets ||
      this.targetAssets.find((asset) => asset.type === AssetTypeEnum.NONE);
    if (!nilAsset) {
      this.targetAssets.forEach((targetAsset) => {
        let pos: Position[] = portfolio.positions.filter(
          (pos) =>
            pos.name === targetAsset.name && pos.type === targetAsset.type
        );
        positions.push(...pos);
      });
    } else {
      positions.push(...portfolio.positions);
    }

    let currentlyInvested = Allocation.calculatePositionAllocation(
      this.allocation.type,
      portfolio.buyingPower,
      positions,
      priceMap
    );
    return compare(currentlyInvested, this.allocation.amount, this.comparator);
  }

  public getForm(): FormControl {
    const formControl = super.getForm();
    formControl.addGroup(FormGroup.targetAssets(this.targetAssets));
    formControl.addGroup(FormGroup.allocation("allocation", this.allocation));
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
