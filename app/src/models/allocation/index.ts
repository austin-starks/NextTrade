import {
  AllocationEnum,
  AssetTypeEnum,
  BuyOrSellEnum,
  FillProbabilityEnum,
} from "../../utils/enums";
import { AbstractAsset } from "../asset";
import { IPosition } from "../position";
import PriceMap from "../priceMap";

interface IAllocationObj {
  type: AllocationEnum;
  amount: number;
}

export class Allocation {
  /**
   * Model that calculates the number of shares to buy or sell based on the
   * configuration provided by the user.
   *
   * @remarks
   * Different strategies may want to buy a certain number of shares, a
   * dollar amount of shares, or a percent of your portfolio. This class calculates
   * the number of shares to buy or sell based on the configuration provided.
   *
   */
  type: AllocationEnum;
  amount: number;

  constructor(fromObj: IAllocationObj) {
    this.type = fromObj.type;
    this.amount = fromObj.amount;
  }

  public static calculateQuantityToBuy(
    asset: AbstractAsset,
    priceMap: PriceMap,
    buyAmount: PurchaseAndSaleAllocation,
    buyingPower: number,
    positions: IPosition[],
    config: { fillAt: FillProbabilityEnum }
  ): number {
    if (buyingPower <= 0) {
      return 0;
    }
    let fillAt = config.fillAt;
    let maxNumShares = PurchaseAndSaleAllocation.calculateNumShares(
      buyAmount,
      buyingPower,
      positions,
      priceMap,
      asset,
      BuyOrSellEnum.BUY,
      fillAt
    );

    let price = priceMap.getDynamicPrice(asset, BuyOrSellEnum.BUY, fillAt);
    let numShares = maxNumShares;
    if (maxNumShares * price > buyingPower) {
      numShares = (buyingPower / price) * 0.99; // account for commission
    }

    if (
      asset.type === AssetTypeEnum.OPTION ||
      asset.type === AssetTypeEnum.DEBIT_SPREAD
    ) {
      return Math.floor(numShares);
    }
    return numShares;
  }

  private static getquantity(positions: IPosition[], symbol: string) {
    const ind = positions.findIndex((pos) => pos.symbol === symbol);
    if (ind === -1) {
      return 0;
    }
    const pos = positions[ind];
    return pos.quantity;
  }

  public static calculateQuantityToSell(
    asset: AbstractAsset,
    priceMap: PriceMap,
    sellAmount: PurchaseAndSaleAllocation,
    buyingPower: number,
    positions: IPosition[],
    config: any
  ): number {
    let fillAt = config.fillAt;
    const shares: number = PurchaseAndSaleAllocation.calculateNumShares(
      sellAmount,
      buyingPower,
      positions,
      priceMap,
      asset,
      BuyOrSellEnum.BUY,
      fillAt
    );
    let quantityCurrently = this.getquantity(positions, asset.symbol);
    if (
      asset.type === AssetTypeEnum.OPTION ||
      asset.type === AssetTypeEnum.DEBIT_SPREAD
    ) {
      return Math.floor(Math.min(shares, quantityCurrently));
    }
    return Math.min(shares, quantityCurrently);
  }

  public static calculateNumShares(
    allocation: Allocation,
    buyingPower: number,
    positions: IPosition[],
    priceMap: PriceMap,
    asset: AbstractAsset,
    side: BuyOrSellEnum,
    fillProbability: FillProbabilityEnum
  ) {
    let cost = priceMap.getDynamicPrice(asset, side, fillProbability);
    switch (allocation.type) {
      case AllocationEnum.PERCENT_OF_PORTFOLIO:
        var positionValue = this.calcPositionValue(positions, priceMap);
        var totalPortfolioValue = positionValue + buyingPower;
        return (allocation.amount * totalPortfolioValue) / cost / 100;
      case AllocationEnum.PERCENT_OF_CURRENT_POSITIONS:
        var positionValue = this.calcPositionValue(positions, priceMap);
        return (allocation.amount * positionValue) / cost / 100;
      case AllocationEnum.PERCENT_OF_BUYING_POWER:
        return (allocation.amount * buyingPower) / cost / 100;
      case AllocationEnum.DOLLARS:
        return allocation.amount / cost;
      case AllocationEnum.NUM_ASSETS:
        return allocation.amount;
      default:
        throw new Error(
          `Invalid Allocation for PurchaseAndSaleAllocation ${JSON.stringify(
            allocation,
            null,
            2
          )}`
        );
    }
  }

  public static calcPositionValue(positions: IPosition[], priceMap: PriceMap) {
    let positionValue = 0;
    for (let i = 0; i < positions.length; i++) {
      let pos = positions[i];
      positionValue += pos.quantity * priceMap.getPositionPrice(pos);
    }

    return parseFloat(positionValue.toFixed(2));
  }

  protected static countNumAssets(positions: IPosition[]) {
    var result = 0;
    for (let i = 0; i < positions.length; i++) {
      if (positions[i].quantity > 0) {
        result += positions[i].quantity;
      }
    }
    return result;
  }

  public static calculatePositionAllocation(
    allocationType: AllocationEnum,
    buyingPower: number,
    positions: IPosition[],
    priceMap: PriceMap
  ): number {
    let totalPortfolioValue = 0;
    let positionValue: number;
    switch (allocationType) {
      case AllocationEnum.PERCENT_OF_PORTFOLIO:
        positionValue = this.calcPositionValue(positions, priceMap);
        totalPortfolioValue = positionValue + buyingPower;
        return (positionValue / totalPortfolioValue) * 100;
      case AllocationEnum.PERCENT_OF_BUYING_POWER:
        positionValue = this.calcPositionValue(positions, priceMap);
        return (positionValue / buyingPower) * 100;
      case AllocationEnum.PERCENT_OF_CURRENT_POSITIONS:
        return 100;
      case AllocationEnum.DOLLARS:
        return this.calcPositionValue(positions, priceMap);
      case AllocationEnum.NUM_ASSETS:
        return this.countNumAssets(positions);
      default:
        throw new Error(
          "Invalid Allocation Type for Allocation Limit: " + allocationType
        );
    }
  }
}

export class AllocationLimit extends Allocation {
  static MAX_DEFAULT = {
    amount: 100,
    type: AllocationEnum.PERCENT_OF_PORTFOLIO,
  };
  static MIN_DEFAULT = {
    amount: 0,
    type: AllocationEnum.PERCENT_OF_PORTFOLIO,
  };
  public static buyLimitReached(
    allocation: AllocationLimit,
    buyingPower: number,
    positions: IPosition[],
    priceMap: PriceMap
  ): boolean {
    if (allocation.type === AllocationEnum.PERCENT_OF_BUYING_POWER) {
      throw new Error("Cannot use PERCENT_OF_BUYING_POWER for AllocationLimit");
    }
    const amount = this.calculatePositionAllocation(
      allocation.type,
      buyingPower,
      positions,
      priceMap
    );
    return amount > allocation.amount;
  }

  public static sellLimitReached(
    allocation: AllocationLimit,
    buyingPower: number,
    positions: IPosition[],
    priceMap: PriceMap
  ): boolean {
    if (allocation.type === AllocationEnum.PERCENT_OF_BUYING_POWER) {
      throw new Error("Cannot use PERCENT_OF_BUYING_POWER for AllocationLimit");
    }
    const amount = this.calculatePositionAllocation(
      allocation.type,
      buyingPower,
      positions,
      priceMap
    );
    return amount < allocation.amount;
  }
}

export class PurchaseAndSaleAllocation extends Allocation {}
