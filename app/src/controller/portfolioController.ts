import AssetFactory from "../models/asset";
import BrokergeFactory from "../models/brokerage";
import { PortfolioHistory } from "../models/history";
import Portfolio, { MockPortfolio } from "../models/portfolio";
import PriceMap from "../models/priceMap";
import Strategy from "../models/strategy";
import { Request, Response } from "../utils";

class PortfolioController {
  getPortfolios = async (req: Request, res: Response) => {
    const userId = req.user.id;
    const portfolios = await Portfolio.find({ userId });
    res.status(200).json({
      portfolios: portfolios,
    });
  };

  createPortfolio = async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;
      let portfolio = new Portfolio({
        name: req.body.name,
        initialValue: req.body.initialValue,
        main: false,
        userId,
      });
      if (req.body.main) {
        await portfolio.setMainPortfolio(userId);
      } else {
        await portfolio.save();
      }
      res.status(200).json({
        redirectUrl: `/portfolio/${portfolio._id}`,
      });
    } catch (e) {
      res.status(500).json({
        message: e.message,
      });
    }
  };

  getPortfolio = async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;
      const portfolio = await Portfolio.findById(
        req.params.portfolioId,
        userId
      );
      const orders = await portfolio.getOrders(userId);
      res.status(200).json({
        portfolio: portfolio,
        orders,
      });
    } catch (e) {
      console.error(e);
      res.status(404).json({ message: "Portfolio not found" });
    }
  };

  editPortfolioFromMock = async (req: Request, res: Response) => {
    try {
      const mockPortfolio: MockPortfolio = req.body.portfolio;
      const user = req.user;
      const portfolio = await Portfolio.findById(
        req.params.portfolioId,
        user.id
      );
      const strategies = mockPortfolio.strategies.map((strategy) => {
        let updatedStrategy = Strategy.findByIdAndUpdate(
          strategy._id,
          user.id,
          strategy
        );
        return updatedStrategy;
      });
      portfolio.strategies = await Promise.all(strategies);
      await portfolio.save();
      res.status(200).json({
        portfolio: portfolio,
      });
    } catch (e) {
      console.error(e);
      res.status(404).json({ message: "Portfolio not found" });
    }
  };

  editPortfolio = async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;
      const portfolio = await Portfolio.findById(
        req.params.portfolioId,
        userId
      );
      portfolio.active = req.body.active;
      portfolio.deployment = req.body.deployment;
      portfolio.name = req.body.name || portfolio.name;
      if (req.body.main && !portfolio.main) {
        await portfolio.setMainPortfolio(userId);
      } else {
        await portfolio.save();
      }
      res.status(200).json({
        portfolio: portfolio,
      });
    } catch (e) {
      console.error(e);
      res.status(404).json({ message: "Portfolio not found" });
    }
  };

  getPortfolioHistory = async (req: Request, res: Response) => {
    try {
      const portfolio = await Portfolio.findById(
        req.params.portfolioId,
        req.user.id
      );
      if (!portfolio) {
        res.status(200).json({ message: "No portfolio found" });
        return;
      }
      if (!portfolio.active) {
        const brokerage = BrokergeFactory.create(req.user.brokerage);
        const assetList = await AssetFactory.getAssets([portfolio], brokerage);
        const internalMap = await brokerage.getPrices(assetList);
        const priceMap = new PriceMap();
        priceMap.setPriceFromMap(internalMap);
        await portfolio.updateHistory(priceMap);
      }
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 30);
      const recentHistory = await PortfolioHistory.getHistorySlice(
        portfolio._id,
        recentDate,
        new Date()
      );
      const distantHistory = await PortfolioHistory.getHistorySlice(
        portfolio._id,
        new Date(0),
        new Date()
      );
      res.status(200).json({
        history: [...distantHistory, ...recentHistory],
      });
    } catch (e) {
      console.error(e);
      res.status(400).json({ message: "An error occured" });
    }
  };
}

export default new PortfolioController();
