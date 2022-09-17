import { Document, model, Schema, Types } from "mongoose";
import { Id } from "../abstractions/abstractModel";
import Position from "../position";
import { IHistory } from "./interfaces";

interface IPortfolioHistoryTimestamp {
  time: number;
  data: any;
}

const portfolioHistorySchema = new Schema({
  portfolioId: {
    type: Types.ObjectId,
    required: true,
    ref: "Portfolio",
    index: true,
  },
  history: { type: Object, required: true },
  day: { type: Date, index: true },
  hour: { type: Number, index: true },
  minute: { type: Number, index: true },
  bucketSize: Number,
  totalPrice: Number,
});

function getTimeFromDatapoint(dp) {
  const year = dp.day.getUTCFullYear();
  const month = dp.day.getUTCMonth() + 1;
  const date = dp.day.getUTCDate();
  const minute = dp.minute;
  const hour = dp.hour;
  const str = `${month}/${date}/${year} ${hour}:${minute} UTC`;
  const newDate = new Date(str);
  return newDate;
}

interface IPortfolioHistoryDocument extends IHistory, Document {
  history: IPortfolioHistoryTimestamp;
}

const PortfolioHistoryModel = model<IPortfolioHistoryDocument>(
  "PortfolioHistory",
  portfolioHistorySchema
);

export default class PortfolioHistory {
  /**
   * A model representing the portfolio's history over time
   */

  private static async queryHistory(id: Id, startDate: Date, endDate: Date) {
    const history = await PortfolioHistoryModel.find(
      {},
      { day: 1, history: 1, hour: 1, minute: 1 }
    )
      .where("portfolioId")
      .equals(id)
      .where("day")
      .gt(startDate as any)
      .lt(endDate as any);
    return history.map((h) => {
      const time = getTimeFromDatapoint(h.toObject());
      return { time: time, value: h.history.data.value };
    });
  }

  public static async getHistorySlice(id: Id, startDate: Date, endDate: Date) {
    let result = await this.queryHistory(id, startDate, endDate);
    if (result.length > 19) {
      return result.filter((_, index) => {
        const num = result.length / 250;
        return num < 1 || index % Math.ceil(num) === 1;
      });
    }
    return result;
  }

  public static async updatePortfolioHistory(
    portfolioId: Id,
    time: Date,
    data: { value: number; positions: Position[] }
  ) {
    const today = new Date(
      Date.UTC(time.getUTCFullYear(), time.getUTCMonth(), time.getUTCDate())
    );
    await PortfolioHistoryModel.updateOne(
      {
        portfolioId: portfolioId,
        day: today,
        hour: time.getUTCHours(),
        minute: time.getUTCMinutes(),
      },
      {
        history: { time: time.getTime(), data: data },
      },
      { upsert: true }
    );
  }
}
