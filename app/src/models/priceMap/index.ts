import { Document, model, Schema } from "mongoose";
import {
  AssetTypeEnum,
  BidAskEnum,
  BuyOrSellEnum,
  FillProbabilityEnum,
  flipFillProbabilityEnum,
} from "../../utils/enums";
import { AbstractAsset, DebitSpread } from "../asset";
import { IPosition } from "../position";

export type InternalMap = Map<string, PriceObj>;

export default class PriceMap {
  /**
   * Stores and handles the price data in the system.
   *
   * @remarks
   * This class maps asset symbols to priceObjs (bid, ask, mid data about an asset).
   * It also backs up the
   *
   * @privateRemarks
   * It is complicated because of the extensibility, but essentially, the functions
   * can be used to return the price of an asset.
   */

  private map!: InternalMap;
  private backup: MapBackup;

  constructor() {
    this.map = new Map<string, PriceObj>();
    this.backup = new MapBackup();
  }

  public priceIsUnrealistic(targetAsset: AbstractAsset): {
    result: boolean;
    lastPrice: PriceObj;
    currentPrice: PriceObj;
  } {
    const priceObj = this.getPriceObj(targetAsset);
    const priceRange = ["bid", "mid", "ask"];
    const lastMap = this.getMapLastIteration();
    const lastPriceObj = lastMap.getPriceObj(targetAsset);
    if (priceObj["bid"] > priceObj["ask"]) {
      return { result: true, lastPrice: lastPriceObj, currentPrice: priceObj };
    }
    if (!lastPriceObj) {
      return { result: true, lastPrice: lastPriceObj, currentPrice: priceObj };
    }
    for (const val of priceRange) {
      if (!priceObj[val] || !lastPriceObj[val]) {
        return {
          result: true,
          lastPrice: lastPriceObj,
          currentPrice: priceObj,
        };
      }
      if (
        PriceMap.absPercentDifference(priceObj[val], lastPriceObj[val]) > 0.1
      ) {
        return {
          result: true,
          lastPrice: lastPriceObj,
          currentPrice: priceObj,
        };
      }
    }
    return { result: false, lastPrice: lastPriceObj, currentPrice: priceObj };
  }

  private static absPercentDifference(current: number, prev: number) {
    return Math.abs((current - prev) / current);
  }

  private getPriceFromConfig(
    side: BuyOrSellEnum,
    fillAt: FillProbabilityEnum,
    priceObj: PriceObj,
    assetType: AssetTypeEnum
  ): number {
    let price: number;
    switch (fillAt) {
      case FillProbabilityEnum.LIKELY_TO_FILL:
        price = side === BuyOrSellEnum.BUY ? priceObj.ask : priceObj.bid;
        price = assetType === AssetTypeEnum.OPTION ? price * 100 : price;
        return Math.round(price * 100) / 100;
      case FillProbabilityEnum.NEAR_LIKELY_TO_FILL:
        price = side === BuyOrSellEnum.BUY ? priceObj.ask : priceObj.bid;
        price += 2 * priceObj.mid;
        price = assetType === AssetTypeEnum.OPTION ? price * 100 : price;
        return Math.round(price * 33.3333) / 100;
      case FillProbabilityEnum.UNLIKELY_TO_FILL:
        price = side === BuyOrSellEnum.BUY ? priceObj.bid : priceObj.ask;
        price = assetType === AssetTypeEnum.OPTION ? price * 100 : price;
        return Math.round(price * 100) / 100;
      case FillProbabilityEnum.NEAR_UNLIKELY_TO_FILL:
        price = side === BuyOrSellEnum.BUY ? priceObj.bid : priceObj.ask;
        price += 2 * priceObj.mid;
        price = assetType === AssetTypeEnum.OPTION ? price * 100 : price;
        return Math.round(price * 33.3333) / 100;
      case FillProbabilityEnum.MID:
        price = priceObj.mid;
        price = assetType === AssetTypeEnum.OPTION ? price * 100 : price;
        return Math.round(price * 100) / 100;
      default:
        throw new Error("Invalid price configuration");
    }
  }

  public getSpreadPrices(
    assets: { long: AbstractAsset; short: AbstractAsset },
    side: BuyOrSellEnum,
    fillEnum = FillProbabilityEnum.MID
  ) {
    const result = {};
    const keys = Object.keys(assets);
    keys.forEach((k) => {
      if (k === "long") {
        result[k] = this.getDynamicPrice(assets[k], side, fillEnum);
      } else {
        result[k] = this.getDynamicPrice(
          assets[k],
          side,
          flipFillProbabilityEnum(fillEnum)
        );
      }
    });
    return result;
  }

  public getMapLastIteration() {
    const internalMap = this.backup.getBackup();
    if (!internalMap) {
      return null;
    }
    const newMap = new PriceMap();
    newMap.setPriceFromMap(internalMap);
    return newMap;
  }

  public get(
    asset: AbstractAsset,
    side: BuyOrSellEnum,
    fillEnum = FillProbabilityEnum.MID
  ) {
    return this.getDynamicPrice(asset, side, fillEnum);
  }

  public getDynamicPrice(
    asset: AbstractAsset,
    side: BuyOrSellEnum,
    fillEnum = FillProbabilityEnum.MID
  ): number {
    if (side === null) {
      return this.getMidPrice(asset.symbol, asset.type);
    }
    if (asset.type === AssetTypeEnum.DEBIT_SPREAD) {
      const ds = asset as DebitSpread;
      const longPrice = this.getDynamicPrice(ds.long, side, fillEnum);
      const shortPrice = this.getDynamicPrice(
        ds.short,
        side,
        flipFillProbabilityEnum(fillEnum)
      );
      const result = Math.round((longPrice - shortPrice) * 100) / 100;
      return result;
    }
    if (!this.contains(asset.symbol)) {
      throw new Error("Symbol not in pricemap: " + asset.symbol);
    }
    return this.getPriceFromConfig(
      side,
      fillEnum,
      this.map.get(asset.symbol),
      asset.type
    );
  }

  public getStockPrice(asset: AbstractAsset, bidAsk: BidAskEnum) {
    if (!this.contains(asset.name)) {
      throw new Error(`Stock '${asset.name}' not in pricemap.`);
    }
    return this.map.get(asset.name)[bidAsk];
  }

  public getDynamicStockPrice(
    asset: AbstractAsset,
    side: BuyOrSellEnum,
    fillEnum = FillProbabilityEnum.MID
  ): number {
    if (!this.contains(asset.name)) {
      throw new Error(`Stock '${asset.name}' not in pricemap.`);
    }
    if (side === null) {
      return this.getMidPrice(asset.name, asset.type);
    }
    return this.getPriceFromConfig(
      side,
      fillEnum,
      this.map.get(asset.name),
      AssetTypeEnum.STOCK
    );
  }

  public getPriceObj(asset: AbstractAsset | string): PriceObj {
    if (typeof asset === "string") {
      return this.map.get(asset);
    }
    if (asset.type === AssetTypeEnum.DEBIT_SPREAD) {
      const ds = asset as DebitSpread;
      const longPrice = this.getPriceObj(ds.long);
      const shortPrice = this.getPriceObj(ds.short);
      const result = { ...longPrice };
      const keys = Object.keys(longPrice);
      for (const key of keys) {
        result[key] -= shortPrice[key];
      }
      return result;
    }
    return this.map.get(asset.symbol);
  }

  public getSpreadObj(asset: AbstractAsset) {
    if (asset.type !== AssetTypeEnum.DEBIT_SPREAD) {
      return null;
    }
    const ds = asset as DebitSpread;
    return {
      long: this.getPriceObj(ds.long),
      short: this.getPriceObj(ds.short),
    };
  }

  public getStockPriceObj(asset: AbstractAsset) {
    return this.map.get(asset.name);
  }

  public getPositionPrice(pos: IPosition, fillEnum = FillProbabilityEnum.MID) {
    return this.getPriceFromConfig(
      BuyOrSellEnum.SELL,
      fillEnum,
      this.map.get(pos.symbol),
      pos.type
    );
  }

  public set(symbol: string, priceObj: PriceObj) {
    this.map.set(symbol, priceObj);
  }

  public setPriceFromMap(priceMap: InternalMap) {
    const keys = priceMap.keys();
    this.backup.setBackup(this.map);
    for (let assetName of keys) {
      this.set(assetName, priceMap.get(assetName));
    }
  }

  public async saveToDatabase() {
    await this.backup.saveToDatabase(this.map);
  }

  public keys() {
    return this.map.keys();
  }

  public contains(asset: String | AbstractAsset): boolean {
    let assetName =
      typeof asset === "string" ? asset : (asset as AbstractAsset).symbol;
    return this.map.has(assetName);
  }

  private getMidPrice(symbol: string, assetType: AssetTypeEnum): number {
    let tmp = this.map.get(symbol).mid;
    tmp = assetType === AssetTypeEnum.OPTION ? tmp * 100 : tmp;
    return Math.round(tmp * 100) / 100;
  }
}
export interface PriceObj {
  bid: number;
  mid: number;
  ask: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
}

const priceMapSchema = new Schema({
  date: { type: Date, index: true },
  hour: Number,
  minute: Number,
  name: String,
  priceObj: Object,
});

interface IPriceMapDocument extends Document {
  date: Date;
  hour: number;
  minute: number;
  name: string;
  priceObj: PriceObj;
}

interface IPriceMapDocument extends Document {}

const PriceMapModel = model<IPriceMapDocument>("tick", priceMapSchema);

class MapBackup {
  private lastIteration: InternalMap;

  public setBackup(map: InternalMap) {
    this.lastIteration = new Map(map);
  }

  public getBackup() {
    return this.lastIteration;
  }

  public async saveToDatabase(priceMap: InternalMap) {
    const time = new Date();
    const today = new Date(
      Date.UTC(time.getUTCFullYear(), time.getUTCMonth(), time.getUTCDate())
    );
    const keys = priceMap.keys();
    const result = [];
    for (const name of keys) {
      if (priceMap.get(name)) {
        let update = PriceMapModel.updateOne(
          {
            date: today,
            hour: time.getUTCHours(),
            minute: time.getUTCMinutes(),
            name: name,
          },
          {
            priceObj: priceMap.get(name),
          },
          { upsert: true }
        );
        result.push(update);
      }
    }
    await Promise.all(result);
  }
}
