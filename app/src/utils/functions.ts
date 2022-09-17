import date from "date-and-time";
import _ from "lodash";
import { Comparator } from "./enums";
import { Datestring } from "./interfaces";

export function print(...args: any[]) {
  console.log(...args);
}
export function debug(...args: any[]) {
  console.error(...args);
}

export function randomBoxMueller(mean: number, sd: number) {
  let u = Math.random(),
    v = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z0 * sd + mean;
}

export async function batchPromises<T>(
  array: Promise<T>[],
  batchSize: number,
  timeout: number
): Promise<T[]> {
  const result = [];
  for (let i = 0; i < array.length; i += batchSize) {
    const start = i;
    const end = Math.min(start + batchSize, array.length);
    result.push(...(await Promise.all(array.slice(start, end))));
    await sleep(timeout);
  }
  return result;
}

export function msToTime(duration: number): string {
  let milliseconds: number | string = Math.floor((duration % 1000) / 100),
    seconds: number | string = Math.floor((duration / 1000) % 60),
    minutes: number | string = Math.floor((duration / (1000 * 60)) % 60),
    hours: number | string = Math.floor((duration / (1000 * 60 * 60)) % 24);
  hours = hours < 10 ? "0" + hours : hours;
  minutes = minutes < 10 ? "0" + minutes : minutes;
  seconds = seconds < 10 ? "0" + seconds : seconds;
  return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
}

export function randrange(
  min: number,
  max: number,
  isInteger: boolean
): number {
  let result = Math.random() * (max - min) + min;
  return isInteger ? Math.floor(result) : result;
}

export function replaceNulls<T>(obj: T, str = ""): T {
  Object.keys(obj).forEach((key) => {
    if (_.isNil(obj[key])) {
      obj[key] = str;
    }
    if (obj[key] instanceof Object) {
      replaceNulls(obj[key], str);
    }
  });
  return obj;
}

export function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}
export function getMonthYearString(date = new Date()): string {
  const year = date.getUTCFullYear();

  let month = (1 + date.getUTCMonth()).toString();
  month = month.length > 1 ? month : "0" + month;
  return month + "-" + year;
}

export function formatDate(d: Date): Datestring {
  return date.format(d, "YYYY-MM-DD", true) as Datestring;
}
export function getMonthYearObj(date = new Date()) {
  const year = date.getUTCFullYear();
  let month = 1 + date.getUTCMonth();
  return { month, year };
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function compare(
  current: number,
  target: number,
  c: Comparator
): boolean {
  switch (c) {
    case Comparator.LESS_THAN:
      return current < target;
    case Comparator.GREATER_THAN:
      return current > target;
    case Comparator.LESS_THAN_OR_EQUAL_TO:
      return current <= target;
    case Comparator.GREATER_THAN_OR_EQUAL_TO:
      return current >= target;
    case Comparator.EQUAL_TO:
      return current === target;
    default:
      throw new Error("Invalid comparator");
  }
}
