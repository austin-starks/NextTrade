import { AssetTypeEnum } from "../../utils";

export interface IPosition {
  name: string;
  type: AssetTypeEnum;
  quantity: number;
  symbol: string;
  lastPrice: number;
  averageCost?: number;
}

export default class Position implements IPosition {
  /**
   * Represents a position in a portfolio.
   *
   * Positions have a quantity, an average cost, a symbol, and a last price. Because they are not
   * complex and have few methods, they are represented as simple JavaScript objects.
   */

  public name: string;
  public symbol: string;
  public type: AssetTypeEnum;
  public quantity: number;
  public averageCost: number;
  public lastPrice: number;

  constructor(init: IPosition) {
    const { name, symbol, type, quantity } = init;
    const { averageCost, lastPrice } = init;
    this.name = name;
    this.symbol = symbol;
    this.type = type;
    this.quantity = quantity;
    this.lastPrice = lastPrice;
    this.averageCost = averageCost || lastPrice;
  }

  public addPositions(quantity: number, price: number) {
    let totalCost = this.averageCost * this.quantity;
    totalCost += quantity * price;
    this.averageCost = totalCost / (quantity + this.quantity);
    this.quantity += quantity;
  }

  public subtractPositions(quantity: number, price: number) {
    if (quantity < 0) {
      let totalCost = Math.abs(this.averageCost * this.quantity);
      totalCost += Math.abs(quantity * price);
      this.averageCost = Math.abs(totalCost / (quantity + this.quantity));
    }
    this.quantity -= quantity;
  }
}
