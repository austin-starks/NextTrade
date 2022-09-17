import { NextFunction as Next, Request as Req, Response as Res } from "express";
import User from "../models/user";

type Y = number;
type M = number;
type D = number;

export type Datestring = `${Y}${Y}${Y}${Y}-${M}${M}-${D}${D}`;
export interface Request extends Req {
  user: User;
}

export interface MarketDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type MarketDataArray = Array<MarketDataPoint>;

export type MarketDataMap = Map<Datestring, MarketDataPoint>;

export type MarketHistoryDict = Map<string, MarketDataArray>;
export interface Response extends Res {}
export interface NextFunction extends Next {}

export interface Prototype {
  clone: (args: any) => Object;
}
