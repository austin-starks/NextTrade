import StockData from "../models/asset/StockData";
import Portfolio from "../models/portfolio";
import { Request, Response } from "../utils";

class SearchController {
  search = async (req: Request, res: Response) => {
    const query = req.query.q as string;
    let stocks = StockData.searchQueryInModel(query, 8);
    let portfolios = Portfolio.searchQueryInModel(query, 8, req.user.id);
    // let strategies = Strategy.searchQueryInModel(query, 8, req.user.id);
    Promise.all([portfolios, stocks]).then(([portfolios, stocks]) => {
      res.status(200).json({
        options: {
          portfolioOptions: portfolios.map((p) => {
            return { name: p.name, redirectUrl: "/portfolio/" + p._id };
          }),
          strategyOptions: [],
          stockOptions: stocks.map((a) => {
            return {
              name: a.description,
              symbol: a.symbol,
              redirectUrl: "/stock/" + a.symbol,
            };
          }),
          cryptoOptions: [],
        },
      });
    });
  };
}
export default new SearchController();
