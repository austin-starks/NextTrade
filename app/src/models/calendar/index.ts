import { Document, model, Schema } from "mongoose";
import {
  BrokerageEnum,
  debug,
  getMonthYearObj,
  getMonthYearString,
  MarketStatusEnum,
} from "../../utils";
import Tradier from "../brokerage/TradierBrokerage";

const calendarSchema = new Schema({
  days: { type: [Object], required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
});

interface IDay {
  date: string;
  status: MarketStatusEnum;
}

export interface ICalendar {
  days: IDay[];
  month: number;
  year: number;
}

export interface ICalendarDocument extends ICalendar, Document {}

const CalendarModel = model<ICalendarDocument>("Calendar", calendarSchema);

class Calendar {
  private tradier: Tradier;
  private cache: Map<String, IDay[]>;

  constructor() {
    this.tradier = new Tradier({
      name: BrokerageEnum.TRADIER,
      authDetails: {
        token: process.env.TRADIER_TOKEN,
        accountId: process.env.TRADIER_ACCOUNT_ID,
      },
    });
    this.cache = new Map();
  }

  public async dateExistsInDatabase(
    month: number,
    year: number
  ): Promise<boolean> {
    return CalendarModel.exists({ month, year });
  }

  public async saveCalendarData(
    days: { date: string; status: string; description: string }[],
    month: number,
    year: number
  ) {
    const daysTransformed: IDay[] = days.map((day) => {
      return {
        date: day.date,
        status: day.description.includes("early")
          ? MarketStatusEnum.HALFDAY
          : day.status.toLowerCase() === "open"
          ? MarketStatusEnum.OPEN
          : MarketStatusEnum.CLOSED,
      };
    });
    const calendar = new CalendarModel({ days: daysTransformed, month, year });
    await calendar.save();
  }

  public async downloadCalendarData(startYear: number) {
    const endYear = new Date().getFullYear();
    for (let year = startYear; year <= endYear; year++) {
      let exists = await this.dateExistsInDatabase(1, year);
      if (!exists) {
        for (let month = 1; month <= 12; month++) {
          const calendarObj = await this.tradier.getCalendar(month, year);
          await this.saveCalendarData(
            calendarObj.data.calendar.days.day,
            month,
            year
          );
        }
      }
    }
  }

  private async getTradingDaysForMonth(): Promise<IDay[]> {
    let d = new Date();
    d.setUTCHours(14, 29, 40);
    let { month, year } = getMonthYearObj(d);
    let monthYearString = getMonthYearString(d);
    if (this.cache.has(monthYearString)) {
      return this.cache.get(monthYearString);
    }
    let calendar = await CalendarModel.findOne({ month, year });
    if (!calendar) {
      await this.downloadCalendarData(year);
      calendar = await CalendarModel.findOne({ month, year });
    }
    this.cache.set(monthYearString, calendar.days);
    return calendar.days;
  }

  public async marketIsOpenToday(): Promise<boolean> {
    const tradingDays: IDay[] = await this.getTradingDaysForMonth();
    for (let i = 0; i < tradingDays.length; i++) {
      let dayObj = tradingDays[i];
      if (
        new Date(dayObj["date"]).toDateString() === new Date().toDateString()
      ) {
        return dayObj["status"] === MarketStatusEnum.OPEN;
      }
    }
    debug("Throwing error.");
    throw new Error("Cannot determine if market is open");
  }

  private getHourAndMinute(): { hour: number; minute: number } {
    const re = /(\d\d):(\d\d):\d\d/;
    const time = new Date().toUTCString();
    const match = time.match(re);
    return { hour: parseInt(match[1]), minute: parseInt(match[2]) };
  }

  public isBeforeMarketOpen(): boolean {
    const { hour, minute } = this.getHourAndMinute();
    return hour < 14 || (hour === 14 && minute < 30);
  }

  public marketIsOpenNow(): boolean {
    const { hour, minute } = this.getHourAndMinute();
    const afterMarketOpen = hour > 14 || (hour === 14 && minute >= 30);
    const beforeMarketClose = hour < 21;
    return afterMarketOpen && beforeMarketClose;
  }

  public getMSUntilOpen(): number {
    const open = new Date();
    open.setUTCHours(14, 29, 40);
    const difInMS = (open as any) - (new Date() as any);
    return difInMS;
  }

  public getMSUntilTomorrow(): number {
    const tom = new Date();
    tom.setUTCDate(tom.getUTCDate() + 1);
    tom.setUTCHours(7);
    tom.setMinutes(0);
    tom.setSeconds(0);
    tom.setMilliseconds(0);

    return tom.getTime() - new Date().getTime();
  }
}

export default new Calendar();
