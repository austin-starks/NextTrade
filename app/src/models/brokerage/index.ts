import { BrokerageEnum } from "../../utils/enums";
import AbstractBrokerage, { IBrokerage } from "./AbstractBrokerage";
import AlpacaBrokerage from "./AlpacaBrokerage";
import BacktestBrokerage from "./BacktestBrokerage";
import TestBrokerage, {
  TestBrokerageWithMarketHistorySpy,
} from "./TestBrokerage";
import TradierBrokerage from "./TradierBrokerage";

export {
  TestBrokerage,
  AbstractBrokerage,
  IBrokerage,
  TradierBrokerage,
  TestBrokerageWithMarketHistorySpy,
  BacktestBrokerage,
};

export default class BrokergeFactory {
  public static create(obj: IBrokerage): AbstractBrokerage {
    switch (obj.name) {
      case BrokerageEnum.ALPACA:
        return new AlpacaBrokerage(obj);
      case BrokerageEnum.TRADIER:
        return new TradierBrokerage(obj);
      case BrokerageEnum.TEST:
        return new TestBrokerage(obj);
      case BrokerageEnum.TEST_WITH_MARKET_HISTORY_SPY:
        return new TestBrokerageWithMarketHistorySpy(obj);
      default:
        throw new Error("Brokerage type not implemented " + obj.name);
    }
  }
}
