import { AssetTypeEnum } from "../../utils/enums";
import AbstractAsset from "./AbstractAsset";

export default class Cryptocurrency extends AbstractAsset {
  public name: string;
  public symbol: string;
  public type: AssetTypeEnum;

  constructor(name: string) {
    super();
    this.name = name ? name.toUpperCase() : undefined;
    this.symbol = name ? name.toUpperCase() : undefined;
    this.type = AssetTypeEnum.CRYPTO;
  }

  public getClass() {
    return "cryptocurrency";
  }
}
