import { Id } from "../abstractions/abstractModel";

export interface IHistory {
  strategyId: Id;
}

export type timestamp = { time: string; value: number };
