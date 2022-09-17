import { formatDate, ValidationError } from "../../utils";
import { AssetTypeEnum, OptionTypeEnum } from "../../utils/enums";
import { AbstractBrokerage } from "../brokerage";
import ConditionFactory from "../conditions";
import AbstractPortfolio from "../portfolio/abstractPortfolio";
import { IPosition } from "../position";
import AbstractAsset from "./AbstractAsset";
import Cryptocurrency from "./Cryptocurrency";
import DebitSpread from "./DebitSpread";
import NullAsset from "./Null";
import Option, {
  ExpirationConfig,
  OptionChain,
  OptionConfig,
  StrikePriceConfig,
} from "./Option";
import Stock from "./Stock";
import StockData from "./StockData";

export {
  AbstractAsset,
  Stock,
  Option,
  OptionChain,
  Cryptocurrency,
  ExpirationConfig,
  StrikePriceConfig,
  OptionConfig,
  DebitSpread,
  NullAsset,
};

export default class AssetFactory {
  public static create(obj: AbstractAsset): AbstractAsset {
    if (!obj || !obj.type) {
      return new NullAsset(obj);
    }
    switch (obj.type) {
      case AssetTypeEnum.NONE:
        return new NullAsset(obj);
      case AssetTypeEnum.STOCK:
        return new Stock(obj.name);
      case AssetTypeEnum.CRYPTO:
        return new Cryptocurrency(obj.name);
      case AssetTypeEnum.DEBIT_SPREAD:
        const { long, short } = obj as DebitSpread;
        return new DebitSpread(
          AssetFactory.create(long) as Option,
          AssetFactory.create(short) as Option
        );
      case AssetTypeEnum.OPTION:
        const {
          name,
          strikePriceConfig,
          expirationDateConfig,
          optionType,
          expiration,
          strikePrice,
          symbol,
        } = obj as Option;
        const optionConfig: OptionConfig = {
          strikePriceConfig: strikePriceConfig,
          expirationDateConfig: expirationDateConfig,
          optionType: optionType,
        };
        let option = new Option(name, optionConfig);
        option.expiration = expiration;
        option.strikePrice = strikePrice;
        option.symbol = symbol;
        return option;
      default:
        if (obj.name) {
          throw new ValidationError(
            `'${obj.name.toUpperCase()}' is missing an attribute`
          );
        } else if (obj.type) {
          throw new ValidationError(
            `Asset with type ${obj.type} is missing an attribute`
          );
        }
        throw new ValidationError("Asset is missing attributes");
    }
  }

  public static getAssetType(asset: AbstractAsset) {
    return asset.type === AssetTypeEnum.STOCK
      ? "shares"
      : asset.type === AssetTypeEnum.CRYPTO
      ? "coins"
      : asset.type === AssetTypeEnum.OPTION
      ? "contracts"
      : "number of assets";
  }

  public static async validate(asset: AbstractAsset | AbstractAsset[]) {
    let assets: AbstractAsset[] = Array.isArray(asset) ? asset : [asset];
    for (let i = 0; i < assets.length; i++) {
      let asset = assets[i];
      if (!asset) {
        throw new ValidationError("Asset is undefined");
      }
      if (!asset.type) {
        throw new ValidationError(
          `Asset with name '${asset.name.toUpperCase()}' is missing an attribute`
        );
      }
      if (!asset.name && asset.type !== AssetTypeEnum.NONE) {
        throw new ValidationError(
          `Asset with type '${asset.type}' is missing an attribute`
        );
      }
      if (asset.type === AssetTypeEnum.NONE) {
        continue;
      }
      if (
        [
          AssetTypeEnum.STOCK,
          AssetTypeEnum.OPTION,
          AssetTypeEnum.DEBIT_SPREAD,
        ].includes(asset.type)
      ) {
        // validate stock name exists
        const exists = await StockData.exists(asset.name);
        if (!exists) {
          throw new ValidationError(`${asset.name} does not exist`);
        }
      }
      if (
        [AssetTypeEnum.OPTION, AssetTypeEnum.DEBIT_SPREAD].includes(asset.type)
      ) {
        const { expiration, strikePrice, optionType } = asset as Option;
        if (!expiration) {
          throw new ValidationError("Expiration Date is required");
        }
        if (!strikePrice) {
          throw new ValidationError("Strike Price is required");
        }
        if (!optionType) {
          throw new ValidationError("Option Type is required");
        }
      }
    }
  }

  public static createFromPosition(pos: IPosition): AbstractAsset {
    switch (pos.type) {
      case AssetTypeEnum.STOCK:
        return new Stock(pos.name);
      case AssetTypeEnum.OPTION:
        let regex = /(\D+)(\d{2})(\d{2})(\d{2})(\D)(\d{5})\d+/;
        let match = pos.symbol.match(regex);
        let o = new Option(match[1]);
        o.symbol = match[0];
        let optionType =
          match[5] === "C" ? OptionTypeEnum.CALL : OptionTypeEnum.PUT;
        o.optionType = optionType;
        let expiration = new Date(
          parseInt(match[2]),
          parseInt(match[3]),
          parseInt(match[4])
        );
        o.expiration = formatDate(expiration);
        o.strikePrice = parseInt(match[6]);
        return o;
      default:
        throw new Error("Asset Not Found/Not Implemented");
    }
  }

  public static createFromPositionArray(pos: IPosition[]): AbstractAsset[] {
    return pos.map((position) => {
      return this.createFromPosition(position);
    });
  }

  public static async getAssets(
    portfolios: AbstractPortfolio[],
    brokerage: AbstractBrokerage
  ): Promise<AbstractAsset[]> {
    // getAllActiveStrategies : Strategy Enitity
    const strategies = portfolios
      .map((p) => p.strategies)
      .reduce((acc, cur) => acc.concat(cur), []);
    const assetMap = new Map<string, AbstractAsset>();
    const appendAsset = async (asset: AbstractAsset) => {
      let targetAsset = asset;
      if (asset.type === AssetTypeEnum.NONE || asset instanceof NullAsset) {
        return;
      }
      if (
        targetAsset.type === AssetTypeEnum.OPTION ||
        targetAsset.type === AssetTypeEnum.DEBIT_SPREAD
      ) {
        [targetAsset] = await Option.getOptionSymbol(targetAsset, brokerage);
      } else {
        targetAsset = AssetFactory.create(targetAsset);
      }
      if (targetAsset.type === AssetTypeEnum.DEBIT_SPREAD) {
        const long = (targetAsset as DebitSpread).long;
        const short = (targetAsset as DebitSpread).short;
        assetMap.set(long.symbol, long);
        assetMap.set(short.symbol, short);
      } else {
        assetMap.set(targetAsset.symbol, targetAsset);
      }
    };
    // getAllStocks/Options in activeStrategies
    for (let i = 0; i < strategies.length; i++) {
      let strategy = strategies[i];
      let targetAsset = strategy.targetAsset;
      await appendAsset(targetAsset);
      let conditions = [
        ...strategy.buyingConditions,
        ...strategy.sellingConditions,
      ];
      for (let j = 0; j < conditions.length; j++) {
        let condition = ConditionFactory.create(conditions[j]);
        let assetFields = condition.assetFields;
        if (!condition.hasAssetField()) {
          continue;
        }
        for (let k = 0; k < assetFields.length; k++) {
          let assetField = assetFields[k];
          if (assetField.value instanceof AbstractAsset) {
            assetField.value = [assetField.value];
          }
          for (let k = 0; k < assetField.value.length; k++) {
            await appendAsset(assetField.value[k]);
          }
        }
      }
    }
    for (let i = 0; i < portfolios.length; i++) {
      let positionsAssts = AssetFactory.createFromPositionArray(
        portfolios[i].positions
      );
      for (let k = 0; k < positionsAssts.length; k++) {
        assetMap.set(positionsAssts[k].symbol, positionsAssts[k]);
      }
    }
    return Array.from(assetMap.values());
  }
}
