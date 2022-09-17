import { AssetTypeEnum } from "../../utils/enums";
import AbstractAsset from "./AbstractAsset";

export default class NullAsset extends AbstractAsset {
  public name: string;
  public symbol: string;
  public type: AssetTypeEnum;

  constructor(obj?: AbstractAsset) {
    super();
    this.name = obj?.name || "";
    this.type = AssetTypeEnum.NONE;
    this.symbol = obj?.symbol || "";
  }

  public getClass() {
    return "none";
  }
}
