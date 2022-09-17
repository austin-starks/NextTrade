import { Worker } from "worker_threads";
import BrokergeFactory, { BacktestBrokerage } from "../../models/brokerage";
import FormControl from "../../models/field/formControl";
import Optimizer, { IOptimizer } from "../../models/optimization";
import Portfolio from "../../models/portfolio";
import User from "../../models/user";
import {
  FitnessEnum,
  FormValidationError,
  Request,
  Response,
  StatusEnum,
} from "../../utils";

const killAllOptimizers = async (user: User) => {
  if (OptimizerController.workers.has(user._id.toString())) {
    const { worker } = OptimizerController.workers.get(user._id.toString());
    await worker.terminate();
    OptimizerController.workers.delete(user._id.toString());
  }
  await Optimizer.killall({ userId: user.id }, "Killed by user");
};

const startOptimizerWorker = (
  req: Request,
  res: Response,
  optimizer: Optimizer
) => {
  optimizer.setState();
  if (optimizer.portfolio.strategies.length === 0) {
    throw new Error("Can't backtest a portfolio without strategies");
  }
  res.status(200).json({ optimizer: optimizer });
  const worker = optimizer.createWorker(req.user.brokerage);
  OptimizerController.workers.set(req.user._id.toString(), {
    worker,
    optimizerId: optimizer._id.toString(),
  });
};

class OptimizerController {
  static workers: Map<string, { worker: Worker; optimizerId: string }> =
    new Map();

  optimize = async (req: Request, res: Response) => {
    try {
      const user = req.user;
      await killAllOptimizers(user);
      const portfolio = await Portfolio.findById(
        req.params.portfolioId,
        user.id
      );
      const optimizerArgs = {
        _id: req.body.optimizerId,
        name: "",
        startDate: undefined,
        endDate: undefined,
        populationSize: 0,
        userId: undefined,
        portfolio: undefined,
        brokerage: undefined,
        numGenerations: 0,
        fitnessFunction: FitnessEnum.percentChange,
        form: new FormControl(),
      };
      FormControl.validateFields(req.body.form);
      const args: IOptimizer = {
        ...FormControl.create(req.body.form, optimizerArgs),
        userId: user.id,
        brokerage: BacktestBrokerage.create(user.brokerage),
        portfolio,
      };
      const optimizer = new Optimizer(args);
      await optimizer.save();
      startOptimizerWorker(req, res, optimizer);
    } catch (e) {
      console.error(e);
      if (res.headersSent) {
        return;
      }
      if (e instanceof FormValidationError) {
        res.status(400).json({ message: e.message, form: e.object.form });
      } else {
        res.status(400).json({ message: e.message });
      }
    }
  };

  public async runOne(req: Request, res: Response) {
    try {
      await killAllOptimizers(req.user);
      const optimizer = await Optimizer.findOne(
        req.params.optimizerId,
        req.user.id,
        BrokergeFactory.create(req.user.brokerage)
      );
      optimizer.status = StatusEnum.PENDING;
      optimizer.startTime = new Date();
      optimizer.finishTime = null;
      optimizer.currentGeneration = 0;
      await optimizer.save();
      startOptimizerWorker(req, res, optimizer);
    } catch (e) {
      console.error(e);
      res.status(400).json({ message: e.message });
    }
  }

  public async cancel(req: Request, res: Response) {
    try {
      await killAllOptimizers(req.user);
      const optimizer = await Optimizer.findOne(
        req.params.optimizerId,
        req.user.id,
        BrokergeFactory.create(req.user.brokerage)
      );
      optimizer.setState();
      res.status(200).json({ optimizer: optimizer });
    } catch (e) {
      console.error(e);
      res.status(400).json({ message: e.message });
    }
  }

  public async getOne(req: Request, res: Response) {
    try {
      const statePageNumber = 1;
      const optimizer = await Optimizer.findOne(
        req.params.optimizerId,
        req.user.id,
        BrokergeFactory.create(req.user.brokerage),
        statePageNumber
      );
      optimizer.setState();
      res.status(200).json({ optimizer });
    } catch (e) {
      console.error(e);
      res.status(400).json({ message: e.message });
    }
  }

  public async editOne(req: Request, res: Response) {
    try {
      await killAllOptimizers(req.user);
      const optimizer = await Optimizer.findOne(
        req.params.optimizerId,
        req.user.id,
        BrokergeFactory.create(req.user.brokerage)
      );
      FormControl.set(optimizer, req.body.form);
      await optimizer.save();
      optimizer.setState();
      res.status(200).json({ optimizer: optimizer, optimizers: [] });
    } catch (e) {
      console.error(e);
      res.status(400).json({ message: e.message });
    }
  }

  public async getOneForm(req: Request, res: Response) {
    try {
      const statePageNumber = 1;
      const optimizor = await Optimizer.findOne(
        req.params.optimizerId,
        req.user.id,
        BrokergeFactory.create(req.user.brokerage),
        statePageNumber
      );
      res.status(200).json({ form: optimizor.getForm(), optimizers: [] });
    } catch (e) {
      console.error(e);
      res.status(400).json({ message: e.message });
    }
  }

  public async getForm(req: Request, res: Response) {
    try {
      const optimizor = new Optimizer(null);
      res.status(200).json({ form: optimizor.getForm(), optimizers: [] });
    } catch (e) {
      console.error(e);
      res.status(400).json({ message: e.message });
    }
  }

  public async getSummaries(req: Request, res: Response) {
    try {
      const portfolio = await Portfolio.findById(
        req.params.portfolioId,
        req.user.id
      );
      const limit = 5;
      const summaries = await Optimizer.findSummaries(
        portfolio._id,
        req.user.id,
        limit
      );
      res.status(200).json({ optimizers: summaries });
    } catch (e) {
      console.error(e);
      res.status(400).json({ message: e.message });
    }
  }
}

export default new OptimizerController();
