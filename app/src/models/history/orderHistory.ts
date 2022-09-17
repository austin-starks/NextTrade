import { Document, model, Schema, Types } from "mongoose";
import { Id } from "../abstractions/abstractModel";
import { IHistory } from "./interfaces";

const orderHistorySchema = new Schema({
  history: {
    type: [
      {
        time: Number,
        data: {
          orderId: {
            type: Types.ObjectId,
            ref: "Order",
          },
          commission: Number,
        },
      },
    ],
    default: [],
    required: true,
  },
  strategyId: {
    type: Types.ObjectId,
    ref: "Strategy",
    required: true,
  },
  orderId: {
    type: Types.ObjectId,
    ref: "Order",
    required: true,
  },
  day: Date,
  bucketSize: Number,
  commission: Number,
});

interface IOrderHistoryTimestamp {
  time: number;
  data: any;
}

interface IOrderHistoryDocument extends IHistory, Document {
  history: Array<IOrderHistoryTimestamp>;
}

const OrderHistoryModel = model<IOrderHistoryDocument>(
  "OrderHistory",
  orderHistorySchema
);

export default class OrderHistory {
  /**
   * Models the order history of a portfolio
   */

  public static async addToOrderHistory(
    strategyId: Id,
    orderId: Id,
    commission: number
  ) {
    const time = new Date();
    const today = new Date(
      Date.UTC(time.getUTCFullYear(), time.getUTCMonth(), time.getUTCDate())
    );
    await OrderHistoryModel.updateOne(
      {
        strategyId: strategyId,
        bucketSize: { $lt: 5 },
        day: today,
      },
      {
        $push: {
          history: {
            time: time.getTime(),
            data: {
              orderId: orderId,
              commission: commission,
            },
          },
        },
        $min: { first: time.getTime() },
        $max: { last: time.getTime() },
        $inc: { bucketSize: 1, commission: commission },
      },
      { upsert: true }
    );
  }

  public static async getOrders(strategyIds: any) {
    const buckets = await OrderHistoryModel.find({
      strategyId: { $in: strategyIds },
    })
      .populate({ path: "history.data.orderId", model: "Order" })
      .populate({ path: "strategyId", model: "Strategy" });
    const result = buckets
      .map((bucket) => {
        return bucket.history.map((ts) => {
          return {
            time: ts.time,
            order: ts.data.orderId,
            commission: ts.data.commission,
            strategy: {
              name: (bucket.strategyId as any).name,
            },
          };
        });
      })
      .flat(1);
    result.sort((a, b) => b.time - a.time);
    return result;
  }
}
