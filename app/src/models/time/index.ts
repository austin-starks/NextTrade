import { formatDate, TimeIntervalEnum } from "../../utils";
import Duration from "./duration";
export { Duration };
class Time {
  /**
   * Represents the time of day for backtesting functionality.
   *
   * @remarks
   * Backtests can be done using different granularity of data. Because this system values
   * extensibility, we can easily change how the time is represented depending on the data we
   * have access to
   */
  public frequency: TimeIntervalEnum;
  public timeIndex: number;
  public timeArray: Array<string>;

  constructor(frequency: TimeIntervalEnum) {
    this.frequency = frequency;
    this.timeArray = this.initializeTimeArray();
    this.timeIndex = 0;
  }

  public initializeTimeArray(): string[] {
    switch (this.frequency) {
      case TimeIntervalEnum.MINUTE:
        return this.minuteTimeArray();
      case TimeIntervalEnum.HOUR:
        return this.hourTimeArray();
      case TimeIntervalEnum.DAY:
        return this.dayTimeArray();
      default:
        throw new Error("Invalid time frequency");
    }
  }

  private minuteTimeArray(): string[] {
    throw new Error("Method not implemented.");
  }

  private hourTimeArray(): string[] {
    throw new Error("Method not implemented.");
  }

  private dayTimeArray(): string[] {
    return ["open", "close"];
  }

  public initialTime(): string {
    return this.timeArray[0];
  }

  public now(): string {
    return this.timeArray[this.timeIndex];
  }

  public isEOD() {
    return this.timeIndex === this.timeArray.length - 1;
  }

  public next() {
    this.timeIndex = (this.timeIndex + 1) % this.timeArray.length;
  }

  public toString(): string {
    return this.now();
  }

  public getDateTime(currentDate: Date): Date {
    switch (this.frequency) {
      case TimeIntervalEnum.DAY:
        const datestring = formatDate(currentDate) + " 09:30";
        const d = new Date(datestring);
        if (this.isEOD()) {
          d.setHours(16);
          d.setMinutes(0);
        }
        d.setDate(currentDate.getDate());
        return d;
      case TimeIntervalEnum.MINUTE:
      case TimeIntervalEnum.HOUR:
        throw new Error("time frequency not implemented");
      default:
        throw new Error("Invalid time frequency");
    }
  }
}

export default Time;
