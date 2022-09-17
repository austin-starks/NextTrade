import BrokergeFactory from "../models/brokerage";
import PriceHistory from "../models/history/priceHistory";
import { Request, Response } from "../utils";
const YEARS_BACK = 5;

class StockController {
  getHistory = async (req: Request, res: Response) => {
    const assetName = req.params.symbol;
    const brokerage = BrokergeFactory.create(req.user.brokerage);
    const history = await new PriceHistory().get(
      brokerage,
      assetName,
      YEARS_BACK
    );
    res.status(200).json({
      history,
    });
  };

  getData = async (req: Request, res: Response) => {
    const symbol = req.params.symbol;
    const brokerage = BrokergeFactory.create(req.user.brokerage);
    const price = await brokerage.getDynamicPrice(symbol);
    res.status(200).json({
      value: price.mid,
    });
  };
}
export default new StockController();
