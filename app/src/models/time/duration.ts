import date from "date-and-time";
import { TimeIntervalEnum } from "../../utils";

class Duration {
  number: number;
  unit: TimeIntervalEnum;
  constructor(number: number, unit: TimeIntervalEnum) {
    this.number = number;
    this.unit = unit;
  }

  public static getDateTime(d: Date, duration: Duration): Date {
    let nextDate: Date;
    switch (duration.unit) {
      case TimeIntervalEnum.DAY:
        nextDate = date.addDays(d, duration.number);
        break;
      case TimeIntervalEnum.HOUR:
        nextDate = date.addHours(d, duration.number);
        break;
      case TimeIntervalEnum.MINUTE:
        nextDate = date.addMinutes(d, duration.number);
        break;
      default:
        throw new Error("Invalid time interval for getting time");
    }
    return nextDate;
  }
}

export default Duration;
