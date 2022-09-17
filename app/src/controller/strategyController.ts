import AssetFactory from "../models/asset";
import ConditionFactory from "../models/conditions";
import Portfolio from "../models/portfolio";
import Strategy, { IStrategy } from "../models/strategy";
import { AllocationEnum, debug, Request, Response } from "../utils";

class StrategyController {
  get = async (req: Request, res: Response) => {
    const user = req.user;
    try {
      const strategies = await Strategy.find({ userId: user.id });
      res.status(200).json({ strategies });
    } catch (e) {
      debug(e);
      res.status(500).json({ message: e.message });
    }
  };

  getOne = async (req: Request, res: Response) => {
    const user = req.user;
    const strategyId = req.params.strategyId;
    try {
      const strategy = await Strategy.findById(strategyId, user.id);
      res.status(200).json({ strategy });
    } catch (e) {
      debug(e);
      res.status(500).json({ message: e.message });
    }
  };

  updatePortfolioStrategy = async (req: Request, res: Response) => {
    try {
      const user = req.user;
      const data: IStrategy = req.body;
      await AssetFactory.validate(data.targetAsset);
      data.buyingConditions = ConditionFactory.createFromArray(
        data.buyingConditions || []
      );
      data.sellingConditions = ConditionFactory.createFromArray(
        data.sellingConditions || []
      );
      const strategy = await Strategy.findOrCreate(data, user.id);
      const portfolio = await Portfolio.findById(
        req.params.portfolioId,
        user.id
      );
      if (!portfolio) {
        throw new Error("Portfolio not found");
      }
      const strategies = portfolio.getStrategies();
      const strategyIdx = strategies.findIndex((s) => {
        return s.id.toString() === strategy.id.toString();
      });
      if (strategyIdx === -1) {
        portfolio.addStrategy(strategy);
      } else {
        let updatedStrategy = await Strategy.findByIdAndUpdate(
          strategy.id,
          user.id,
          data
        );
        portfolio.strategies[strategyIdx] = updatedStrategy;
      }
      await portfolio.save();
      res.status(200).json({ portfolio: portfolio });
    } catch (e) {
      debug(e);
      res.status(400).json({ message: e.message });
    }
  };

  deletePortfolioStrategy = async (req: Request, res: Response) => {
    try {
      const user = req.user;
      const portfolio = await Portfolio.findById(
        req.params.portfolioId,
        user.id
      );
      if (!portfolio) {
        throw new Error("Portfolio not found");
      }
      portfolio.strategies = portfolio.strategies.filter((s) => {
        return s._id.toString() !== req.params.strategyId;
      });
      await portfolio.save();
      await Strategy.deleteById(req.params.strategyId, user.id);
      res.status(200).json({ portfolio: portfolio });
    } catch (e) {
      debug(e);
      res.status(400).json({ message: e.message });
    }
  };
}

export const transformStrategy = (strategy: Strategy) => {
  const result: any = strategy;
  result.createdAt = strategy.createdAt.toLocaleString();
  const assetType = AssetFactory.getAssetType(result.targetAsset);
  if (result.buyAmount.type === AllocationEnum.NUM_ASSETS) {
    result.buyAmount.type = assetType;
  }
  if (result.sellAmount.type === AllocationEnum.NUM_ASSETS) {
    result.sellAmount.type = assetType;
  }
  return result;
};

export default new StrategyController();
