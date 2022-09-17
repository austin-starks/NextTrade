import date from "date-and-time";
import { cloneDeep } from "lodash";
import { useEffect, useRef } from "react";
import {
  AssetTypeEnum,
  DateGraphEnum,
  Datestring,
  timestamp,
} from "../services/outsideInterfaces";
export const green = "#5AC53B";
export const red = "#FF4F4F";
export const pink = "#ff69b4";
export const yellowGreen = "#9acd32";
export const lightgrey = "#f5f5f5";
export const grey = "#333333";
export const gray = grey;
export const darkgray = "#202020";
export const darkgrey = darkgray;

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getDuration(start?: Date, end?: Date): number {
  if (!start) {
    return -1;
  }
  const diff =
    new Date(end || new Date()).getTime() - new Date(start).getTime();
  return diff;
}

export function durationToString(diff: number): string {
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return `${hours}h ${minutes}m ${seconds}s`;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Pads the array so that the graph looks more complete
 *
 * @param array: The array of datapoints that you are padding numbers to the beginning of
 * @param time: The time to start the padding at
 * @returns
 */
export function padResult<T extends timestamp>(array: T[], time: Date): T[] {
  let result: T[] = [];
  if (array.length === 0) {
    return cloneDeep(array);
  }
  const firstTimestamp = new Date(array[0].time);
  while (time < firstTimestamp) {
    let tmpDate = new Date(time.toDateString());
    result.push({ ...cloneDeep(array[0]), time: tmpDate });
    time.setDate(time.getDate() + 1);
  }
  array.forEach((ts) => {
    result.push(ts);
  });
  return result;
}

export function filterHistory(
  history: timestamp[],
  day: DateGraphEnum,
  endDateOriginal: Date
) {
  let result = [];
  let endDate = new Date(endDateOriginal);
  const filter = (ts: { time: Date | string; value: number }) => {
    return new Date(ts.time) > endDate;
  };
  switch (day) {
    case DateGraphEnum.TWO_DAYS:
      endDate.setDate(endDate.getDate() - 2);
      result = history.filter(filter);
      break;
    case DateGraphEnum.WEEK:
      endDate.setDate(endDate.getDate() - 7);
      result = history.filter(filter);
      break;
    case DateGraphEnum.MONTH:
      endDate.setDate(endDate.getDate() - 30);
      result = history.filter(filter);
      break;
    case DateGraphEnum.THREE_MONTHS:
      endDate.setDate(endDate.getDate() - 90);
      result = history.filter(filter);
      break;
    case DateGraphEnum.YEAR:
      endDate.setDate(endDate.getDate() - 365);
      result = history.filter(filter);
      break;
    case DateGraphEnum.TWO_YEARS:
      endDate.setDate(endDate.getDate() - 365 * 2);
      result = history.filter(filter);
      break;
    case DateGraphEnum.FIVE_YEARS:
      endDate.setDate(endDate.getDate() - 365 * 5);
      result = history.filter(filter);
      break;
    case DateGraphEnum.ALL:
      result = history;
      break;
    case DateGraphEnum.YTD:
      endDate = new Date("January 1, " + new Date().getUTCFullYear());
      result = history.filter(filter);
      break;
    default:
      throw new Error("Invalid date for getPortfolioHistory");
  }
  if (result.length < 350) {
    return result;
  }
  return result.filter((_, index) => {
    const num = result.length / 350;
    return num <= 1 || index % Math.ceil(num) === 1;
  });
}
/**
 * Hook that detects clicks outside of the passed ref
 */
export function useDetectOutsideClick(
  ref: React.RefObject<HTMLElement>,
  cb: () => void
) {
  useEffect(() => {
    /**
     * Trigger cb if clicked on outside of element
     */
    function handleClickOutside(event: any) {
      if (ref.current && !ref.current.contains(event.target)) {
        cb();
      }
    }

    // Bind the event listener
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref, cb]);
}

export function getAssetType(asset: { name: string; type: string }) {
  return asset.type === AssetTypeEnum.STOCK
    ? "Shares"
    : asset.type === AssetTypeEnum.CRYPTO
    ? "Coins"
    : asset.type === AssetTypeEnum.OPTION
    ? "Contracts"
    : "Number of assets";
}

export const commifyLargeNumber = (number: number) => {
  const rounded = Math.round(number * 100) / 100;
  const strNumber = rounded.toString();
  return strNumber.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

export function formatDate(d: Date): Datestring {
  return date.format(d, "YYYY-MM-DD", true) as Datestring;
}

export function useInterval(callback: () => any, delay: number) {
  const savedCallback = useRef<() => any>();

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function tick() {
      if (savedCallback.current) {
        savedCallback.current();
      }
    }
    if (delay !== null) {
      let id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}
