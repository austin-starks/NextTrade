import { PositionInfo } from "./outsideInterfaces";

export const createMockData = () => {
  let data: { x: Date; y: number }[] = [];
  let value = 1000;
  for (var i = 0; i < 366; i++) {
    let date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(i);
    value += Math.round((Math.random() < 0.5 ? 1 : -0.8) * Math.random() * 400);
    data.push({ x: date, y: value });
  }
  return data;
};

export const OPTION_LIST: PositionInfo[] = [
  {
    name: "COIN $355 Call",
    quantity: "11/26 Exp • 2 Buys",
    price: 9.65,
    percentChange: 14.65,
  },
  {
    name: "COIN $340 / $360 Calls",
    quantity: "1/21/22 Exp • 1 Debit",
    price: 8.45,
    percentChange: 11.82,
  },
  {
    name: "QQQ $400 Put",
    quantity: "1/21/22 Exp • 1 Buy",
    price: 11.45,
    percentChange: -32.82,
  },
];

export const CRYPTO_LIST = [
  {
    name: "BTC",
    quantity: "0.014567",
    price: 64927,
    percentChange: 1.34,
  },
  {
    name: "ETH",
    quantity: "2.456212",
    price: 4653,
    percentChange: -0.34,
  },
];

export const STOCK_LIST = [
  {
    name: "SI",
    quantity: "8.001",
    price: 226.42,
    percentChange: 0.79,
  },
  {
    name: "COIN",
    quantity: "10",
    price: 334.0,
    percentChange: -1.5,
  },
];

export const WATCH_LIST = [
  {
    name: "SI",
    quantity: "",
    price: 226.42,
    percentChange: 0.79,
  },
  {
    name: "COIN",
    quantity: "",
    price: 334.1,
    percentChange: -1.5,
  },
  {
    name: "QQQ",
    quantity: "",
    price: 401.01,
    percentChange: 0.82,
  },
  {
    name: "BTC",
    quantity: "",
    price: 64927,
    percentChange: 1.34,
  },
  {
    name: "ETH",
    quantity: "",
    price: 4653,
    percentChange: -0.34,
  },
];
