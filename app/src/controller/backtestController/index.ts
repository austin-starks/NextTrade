import { Id } from "../../models/abstractions/abstractModel";
import Backtester from "../../models/backtester";
import BrokergeFactory, { BacktestBrokerage } from "../../models/brokerage";
import Portfolio, { MockPortfolio } from "../../models/portfolio";
import { print, Request, Response } from "../../utils";

class BacktestController {
  public static async create(req: Request, res: Response) {
    try {
      if (!req.body.portfolio) {
        throw new Error("Portfolio is required");
      }
      const portfolio = await Portfolio.findById(
        req.body.portfolio,
        req.user.id
      );
      if (portfolio.strategies.length === 0) {
        throw new Error("Can't backtest a portfolio without strategies");
      }
      const startDate = new Date(req.body.startDate);
      const endDate = new Date(req.body.endDate);
      const brokerage = BrokergeFactory.create(req.user.brokerage);
      const backtester = await Backtester.create({
        name: req.body.name,
        startDate,
        endDate,
        brokerage: BacktestBrokerage.create(brokerage),
        portfolio: MockPortfolio.newBacktest(portfolio),
        userId: req.user.id,
        interval: req.body.interval,
      });
      res.status(200).json({ backtestId: `${backtester.id}` });
      print("Backtest id:", backtester.id);
      await backtester.run({ saveOnRun: true, generateBaseline: true });
      print("Backtest complete", backtester.id);
    } catch (e) {
      console.error(e);
      if (res.headersSent) {
        return;
      }
      res.status(400).json({ message: e.message });
    }
  }

  public static async get(req: Request, res: Response) {
    try {
      const limit = 4;
      let portfolioId: Id = req.params.portfolioId;
      if (!portfolioId || portfolioId === "main") {
        const portfolio = await Portfolio.findMainPortfolio(req.user.id);
        portfolioId = portfolio._id;
      }
      const backtests = await Backtester.findSummaries(
        portfolioId,
        req.user.id,
        limit
      );
      res.status(200).json({ backtests: backtests });
    } catch (e) {
      console.error(e);
      res.status(400).json({ message: e.message });
    }
  }

  public static async getOne(req: Request, res: Response) {
    try {
      const backtest = await Backtester.findOne(
        req.params.backtestId,
        req.user.id
      );
      const actions = backtest.getActions();
      res.status(200).json({ backtest, actions });
    } catch (e) {
      console.error(e);
      res.status(400).json({ message: e.message });
    }
  }

  public static async runOne(req: Request, res: Response) {
    try {
      const backtest = await Backtester.findOneAndRun(
        req.params.backtestId,
        req.user.id,
        BacktestBrokerage.create(req.user.brokerage)
      );
      res.status(200).json({ backtest });
    } catch (e) {
      console.error(e);
      res.status(400).json({ message: e.message });
    }
  }
}

export default BacktestController;
