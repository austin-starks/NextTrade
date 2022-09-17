import { AssetTypeEnum } from "../../utils/enums";
import AbstractAsset from "./AbstractAsset";

export default class Stock extends AbstractAsset {
  public name: string;
  public symbol: string;
  public type: AssetTypeEnum;

  constructor(name: string) {
    super();
    this.name = name ? name.toUpperCase() : undefined;
    this.type = AssetTypeEnum.STOCK;
    this.symbol = name ? name.toUpperCase() : undefined;
  }

  public getClass() {
    return "stock";
  }
}
