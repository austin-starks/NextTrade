import { AssetTypeEnum } from "../../utils/enums";

export default abstract class AbstractAsset {
  abstract name: string;
  abstract type: AssetTypeEnum;
  abstract symbol: string;
  abstract getClass(): string;
}
