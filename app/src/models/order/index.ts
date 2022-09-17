import { model, Schema, Types } from "mongoose";
import { uniqId } from "../../utils";
import {
  BuyOrSellEnum,
  DeploymentEnum,
  OrderStatusEnum,
  OrderTypeEnum,
} from "../../utils/enums";
import AbstractModel, { Id } from "../abstractions/abstractModel";
import { AbstractAsset } from "../asset";
import Portfolio from "../portfolio";
import Strategy from "../strategy";

export interface OrderConfig {
  asset: AbstractAsset;
  side: BuyOrSellEnum;
  price: number;
  strategy: Strategy;
  portfolio: Portfolio;
  deployment: DeploymentEnum;
  userId: Id;
  quantity: number;
  type: OrderTypeEnum;
  otherData?: any;
}

const orderSchema = new Schema({
  brokerageId: { type: String, required: true },
  type: { type: String, required: true },
  status: { type: String, required: true },
  asset: { type: Object, required: true },
  side: { type: String, required: true },
  deployment: { type: String, required: true },
  strategyId: {
    type: Types.ObjectId,
    ref: "Strategy",
  },
  portfolioId: {
    type: Types.ObjectId,
    ref: "Portfolio",
    required: true,
  },
  userId: {
    type: Types.ObjectId,
    ref: "User",
    required: true,
  },
  quantity: { type: Number, required: true },
  priceOfAsset: { type: Number, required: true },
  filledAtPrice: { type: Number, required: false },
  filledAtTime: { type: Number, required: false },
  createdAt: { type: Date, default: Date.now },
  acknowledged: { type: Boolean, required: true, default: false },
  otherData: Object,
});

export interface IOrder {
  brokerageId: Id;
  type: OrderTypeEnum;
  status: OrderStatusEnum;
  asset: AbstractAsset;
  deployment: DeploymentEnum;
  quantity: number;
  priceOfAsset: number;
  side: BuyOrSellEnum;
  strategyId: Id;
  portfolioId: Id;
  userId: Id;
  otherData?: any;
  acknowledged?: boolean;
  filledAtPrice?: number;
  filledAtTime?: Date;
}

export interface IMockOrder {
  currentDate: Date;
  asset: AbstractAsset;
  quantity: number;
  priceOfAsset: number;
  side: BuyOrSellEnum;
  strategyId: Id;
  portfolioId: Id;
  userId: Id;
  otherData?: any;
}

const OrderModel = model<IOrder>("Order", orderSchema);

class Order extends AbstractModel implements IOrder {
  /**
   * A class representing an order
   *
   * @remarks
   * An order is created when the user wants to buy or sell an asset. All
   * orders start as 'unacknowledged', but then after getting filled, are marked
   * as 'acknowledged'.
   */
  _id: Id;
  brokerageId: Id;
  type: OrderTypeEnum;
  status: OrderStatusEnum;
  asset: AbstractAsset;
  deployment: DeploymentEnum;
  quantity: number;
  priceOfAsset: number;
  side: BuyOrSellEnum;
  strategyId: Id;
  portfolioId: Id;
  userId: Id;
  otherData?: any;
  acknowledged?: boolean;
  filledAtPrice?: number;
  filledAtTime?: Date;

  constructor(init: IOrder) {
    super();
    if (init) {
      this.brokerageId = init.brokerageId;
      this.type = init.type;
      this.status = init.status;
      this.asset = init.asset;
      this.deployment = init.deployment;
      this.quantity = init.quantity;
      this.priceOfAsset = init.priceOfAsset;
      this.side = init.side;
      this.strategyId = init.strategyId;
      this.portfolioId = init.portfolioId;
      this.userId = init.userId;
      this.otherData = init.otherData;
      this.acknowledged = init.acknowledged;
      this.filledAtPrice = init.filledAtPrice;
      this.filledAtTime = init.filledAtTime;
    }
  }
  public static createMockOrder(order: IMockOrder): Order {
    const {
      asset,
      quantity,
      priceOfAsset,
      side,
      userId,
      portfolioId,
      strategyId,
      currentDate,
    } = order;
    return new Order({
      type: OrderTypeEnum.MARKET,
      status: OrderStatusEnum.FILLED,
      deployment: DeploymentEnum.PAPER,
      asset: asset,
      quantity: quantity,
      acknowledged: true,
      side: side,
      userId: userId,
      portfolioId: portfolioId,
      strategyId: strategyId,
      priceOfAsset: priceOfAsset,
      filledAtPrice: priceOfAsset,
      filledAtTime: currentDate,
      brokerageId: "BACKTEST-" + uniqId(),
    });
  }

  public async save() {
    if (this._id) {
      await OrderModel.findByIdAndUpdate(this._id, this);
      return;
    }
    const model = await OrderModel.create(this);
    this._id = model.id;
  }

  public async acknowledge() {
    // TODO: Do something with partially filled orders
    this.acknowledged = true;
    this.save();
  }

  public get price() {
    return this.filledAtPrice || this.priceOfAsset;
  }

  public setFilled(price: number, time: Date) {
    this.filledAtPrice = price;
    this.filledAtTime = time;
    this.status = OrderStatusEnum.FILLED;
  }

  public static async getFilledOrders(userId: Id): Promise<Array<Order>> {
    const filledOrders = await OrderModel.find({
      userId: userId,
      acknowledged: false,
      status: OrderStatusEnum.FILLED,
    });
    // TODO: Do something with partially filled orders...
    // const partialledFilledOrders = await OrderModel.find({
    //   acknowledged: false,
    //   status: OrderStatusEnum.PARTIALLY_FILLED
    // });

    let orders = [];
    for (let i = 0; i < filledOrders.length; i++) {
      let tmp = new Order(filledOrders[i]);
      orders.push(tmp);
    }
    // for (let i = 0; i < partialledFilledOrders.length; i++) {
    //   let tmp = new Order();
    //   tmp.model = (partialledFilledOrders[i]);
    //   orders.push(tmp);
    // }
    return orders;
  }

  public static async getUnacknowledgedOrders(
    userId: Id,
    portfolioId: Id
  ): Promise<Array<Order>> {
    const unacknowledgedOrders = await OrderModel.find({
      userId,
      portfolioId,
      acknowledged: false,
    });

    let orders = [];
    for (let i = 0; i < unacknowledgedOrders.length; i++) {
      let tmp = new Order(unacknowledgedOrders[i]);
      orders.push(tmp);
    }
    return orders;
  }

  public static async create(id: Id, oConfig: OrderConfig) {
    const order = new Order({
      brokerageId: id,
      quantity: oConfig.quantity,
      status: OrderStatusEnum.PENDING,
      priceOfAsset: oConfig.price,
      type: oConfig.type,
      asset: oConfig.asset,
      side: oConfig.side,
      deployment: oConfig.deployment,
      strategyId: oConfig.strategy.id,
      portfolioId: oConfig.portfolio._id,
      userId: oConfig.userId,
      otherData: oConfig.otherData,
    });

    await order.save();
    return order;
  }

  public static async find(obj: {
    _id?: Id;
    userId?: Id;
    portfolioId?: Id;
    strategyId?: Id;
    acknowledged?: boolean;
    status?: OrderStatusEnum;
    type?: OrderTypeEnum;
    deployment?: DeploymentEnum;
  }): Promise<Order[]> {
    const orders = await OrderModel.find(obj);
    if (orders) {
      return orders.map((o) => {
        const tmp = new Order(o);
        return tmp;
      });
    }
    return [];
  }
}

export default Order;
