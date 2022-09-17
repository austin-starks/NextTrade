import date from "date-and-time";
import _, { cloneDeep, round } from "lodash";
import { model, Schema, Types } from "mongoose";
import {
  adjectives,
  animals,
  colors,
  uniqueNamesGenerator,
} from "unique-names-generator";
import { Worker } from "worker_threads";
import {
  AllocationEnum,
  batchPromises,
  debug,
  FieldEnum,
  FitnessEnum,
  formatDate,
  print,
  randomBoxMueller,
  randrange,
  sleep,
  StatusEnum,
  TimeIntervalEnum,
  ValidationError,
} from "../../utils";
import AbstractModel, { Id } from "../abstractions/abstractModel";
import AssetFactory, { AbstractAsset } from "../asset";
import Backtester from "../backtester";
import { AbstractBrokerage, BacktestBrokerage, IBrokerage } from "../brokerage";
import ConditionFactory, {
  AbstractCondition,
  AndCondition,
} from "../conditions";
import { ICondition } from "../conditions/abstract";
import AbstractField from "../field/abstract";
import DateField from "../field/date";
import FormControl from "../field/formControl";
import FormGroup from "../field/formGroup";
import NumberField from "../field/number";
import SelectField from "../field/select";
import TextField from "../field/text";
import { timestamp } from "../history/interfaces";
import { MockPortfolio } from "../portfolio";
import AbstractPortfolio from "../portfolio/abstractPortfolio";
import Statistics from "../statistics";
import { IStrategy } from "../strategy";
import DataTransformerBacktestBrokerage, {
  IGeneratedData,
} from "../brokerage/dataTransformer";

const STATE_PAGE_SIZE = 8;
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_BATCH_TIMEOUT = 200;
const DEFAULT_GENERATION_TIMEOUT = 300;
const EXCLUDED_FIELDS = [
  "targetAssets.type",
  "targetAsset.type",
  "duration.unit",
];

interface IRunOptimizerConfig {}

export interface IOptimizer {
  _id?: Id;
  name: string;
  startDate: Date;
  endDate: Date;
  populationSize: number;
  fitnessFunction: FitnessEnum;
  mutationIntensity?: number;
  mutationProbability?: number;
  userId: Id;
  portfolioId?: Id;
  portfolio: AbstractPortfolio;
  brokerage: BacktestBrokerage;
  interval?: TimeIntervalEnum;
  numGenerations: number;
  state?: OptimizerState;
  saveFrequency?: number;
  validationFrequency?: number;
  eliteSpontaneousRatio?: number;
  trainingWindowLength?: number;
  trainValidationRatio?: number;
  comparisonValidationHistory?: timestamp[];
  trainingFitnessHistory?: Statistics[];
  validationFitnessHistory?: Statistics[];
  currentGeneration?: number;
  error?: string;
  status?: StatusEnum;
  lastUpdated?: Date;
  startTime?: Date;
  finishTime?: Date;
  generatedData?: IGeneratedData;
}

interface OptimizerVector {
  fieldName: string;
  value: number;
  isInteger: boolean;
  max: number;
  min: number;
  strategyIdx: number;
  values: string[];
  type: FieldEnum;
}

interface OptimizerSummary {
  _id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: StatusEnum;
  error: string;
}

interface OptimizerStateElement {
  trainingFitness: Statistics;
  validationFitness: Statistics;
  vector: OptimizerVector[];
  portfolio?: MockPortfolio;
}

type OptimizerState = OptimizerStateElement[];

const optimizerSchema = new Schema<Optimizer>({
  name: { type: String, required: true },
  status: { type: String, required: true },
  portfolio: { type: Object, required: true },
  generatedData: { type: Object, required: false },
  state: { type: Array, default: [] },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  interval: { type: String, required: true },
  fitnessFunction: { type: String, required: true },
  error: { type: String, required: false },
  userId: { type: Types.ObjectId, required: true },
  numGenerations: { type: Number, required: true, index: true },
  populationSize: { type: Number, required: true },
  eliteSpontaneousRatio: { type: Number, required: false, default: 0 },
  trainValidationRatio: { type: Number, required: false, default: 0.8 },
  trainingWindowLength: { type: Number, required: false, default: 9999 },
  crossoverProbability: { type: Number, required: false, default: 0.7 },
  currentGeneration: { type: Number, required: false, default: 0 },
  validationFrequency: { type: Number, required: false, default: 1 },
  mutationIntensity: { type: Number, required: false },
  mutationProbability: { type: Number, required: false },
  portfolioId: { type: String, required: false, index: true },
  trainingFitnessHistory: { type: Array, default: [] },
  validationFitnessHistory: { type: Array, default: [] },
  numberCrossoverPoints: { type: Number, required: false },
  createdAt: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now },
  finishTime: { type: Date },
  startTime: { type: Date },
});

const OptimizerModel = model<Optimizer>("Optimizer", optimizerSchema);

class Optimizer extends AbstractModel implements IOptimizer {
  public brokerage: BacktestBrokerage;
  public _id: Id;
  public state: OptimizerState;
  public portfolio: AbstractPortfolio;
  public portfolioId: Id;
  public userId: Id;
  public interval = TimeIntervalEnum.DAY;
  public trainingFitnessHistory: Statistics[] = [];
  public validationFitnessHistory: Statistics[] = [];
  public populationSize = 50;
  public mutationProbability = 0.15;
  public mutationIntensity = 0.2;
  public numGenerations = 10;
  public dateDifference: number;
  public numberCrossoverPoints = 5;
  public trainingWindowLength = 9999;
  public currentGeneration = 0;
  public lastUpdated: Date;
  public finishTime: Date;
  public startTime: Date;
  public readonly startDate: Date = new Date("01-01-2019");
  public readonly endDate: Date = new Date("01-01-2020");
  public trainingStartDate: Date;
  public trainingEndDate: Date;
  public validationStartDate: Date;
  public validationEndDate: Date;
  public name: string = uniqueNamesGenerator({
    dictionaries: [adjectives, colors, animals],
    length: 3,
    separator: " ",
    style: "capital",
  });
  public status: StatusEnum = StatusEnum.PENDING;
  public error: string;
  public saveFrequency = 1;
  public validationFrequency = 1;
  public trainingDateDifference: number;
  public validationDateDifference: number;
  public trainValidationRatio = 0.8;
  public crossoverProbability = 0.7;
  public eliteSpontaneousRatio = 0;
  public fitnessFunction = FitnessEnum.sortino;
  public _BATCH_SIZE = DEFAULT_BATCH_SIZE;
  public _BATCH_TIMEOUT = DEFAULT_BATCH_TIMEOUT;
  public _GENERATION_TIMEOUT = DEFAULT_GENERATION_TIMEOUT;
  public verbose = true;
  public baselineAsset: AbstractAsset;
  public generatedData: IGeneratedData = {
    ratio: 0,
    meanDeviationValue: 0,
  };

  constructor(obj: IOptimizer) {
    super();
    if (!obj) return;
    this._id = obj._id;
    this.error = obj.error;
    const { populationSize, userId, mutationProbability } = obj;
    const portfolio = MockPortfolio.newBacktest(obj.portfolio);
    const { name, brokerage, interval, startDate, endDate } = obj;
    this.state = obj.state || this.createPopulation(portfolio, populationSize);
    this.startDate = new Date(startDate);
    this.endDate = new Date(endDate);
    this.trainValidationRatio = obj.trainValidationRatio || 0.8;
    this.dateDifference = date.subtract(this.endDate, this.startDate).toDays();
    this.trainingDateDifference = Math.floor(
      this.dateDifference * this.trainValidationRatio
    );
    this.validationDateDifference =
      this.dateDifference - this.trainingDateDifference;
    this.trainingStartDate = _.cloneDeep(this.startDate);
    this.trainingEndDate = date.addDays(
      this.trainingStartDate,
      this.trainingDateDifference
    );
    this.validationStartDate = date.addDays(this.trainingEndDate, 1);
    this.validationEndDate = _.cloneDeep(this.endDate);
    this.brokerage = brokerage;
    this.interval = interval || TimeIntervalEnum.DAY;
    this.numGenerations = obj.numGenerations;
    this.populationSize = populationSize;
    this.mutationIntensity = obj.mutationIntensity || 0.2;
    this.mutationProbability = mutationProbability || 0.05;
    this.fitnessFunction = obj.fitnessFunction;
    this.portfolio = portfolio;
    this.portfolioId = portfolio._id;
    this.userId = userId;
    this.trainingFitnessHistory = obj?.trainingFitnessHistory || [];
    this.validationFitnessHistory = obj?.validationFitnessHistory || [];
    this.numberCrossoverPoints = 5;
    this.name = name;
    this.saveFrequency = obj.saveFrequency || 1; // save every 10 generations
    this.validationFrequency = obj.validationFrequency || 1; // save every 1 generations
    this.currentGeneration = 0;
    this.crossoverProbability = 0.7;
    this.eliteSpontaneousRatio = obj.eliteSpontaneousRatio || 0;
    this.trainingWindowLength = obj.trainingWindowLength || 9999;
    this.status = obj.status || StatusEnum.PENDING;
    this.lastUpdated = obj.lastUpdated || new Date();
    this.finishTime = obj.finishTime || undefined;
    this.startTime = obj.startTime || undefined;
    this.generatedData = obj.generatedData || {
      ratio: 0,
      meanDeviationValue: 0,
    };
  }

  public print(...args: any[]) {
    if (this.verbose) {
      print(...args);
    }
  }

  public __unsafeSpeedup() {
    this._BATCH_SIZE = 1000;
    this._BATCH_TIMEOUT = 0;
    this._GENERATION_TIMEOUT = 0;
  }

  public static toSummary(o: Optimizer): OptimizerSummary {
    return {
      _id: o._id.toString(),
      name: o.name,
      startDate: o.startDate,
      endDate: o.endDate,
      status: o.status,
      error: o.error,
    };
  }

  public toSummary(): OptimizerSummary {
    return {
      _id: this._id.toString(),
      name: this.name,
      startDate: this.startDate,
      endDate: this.endDate,
      status: this.status,
      error: this.error,
    };
  }

  setState() {
    if (this.state.length > STATE_PAGE_SIZE) {
      this.state = this.state.slice(0, STATE_PAGE_SIZE);
    }
    this.state.forEach((s) => {
      const newPortfolio = MockPortfolio.newBacktest(this.portfolio);
      Optimizer.setOptimizerVector(newPortfolio, s.vector);
      s.portfolio = newPortfolio;
      s.vector = [];
    });
  }

  createPopulation(
    portfolioObj: AbstractPortfolio,
    numPortfolios: number
  ): OptimizerState {
    let state: OptimizerState = [];
    for (let i = 0; i < numPortfolios; i++) {
      let mockPortfolio = MockPortfolio.newBacktest(portfolioObj);
      let newVector = this.randomizeStrategies(
        mockPortfolio,
        i / numPortfolios
      );
      state.push({
        vector: newVector,
        trainingFitness: new Statistics(),
        validationFitness: new Statistics(),
      });
    }
    return state;
  }

  runPreconditions() {
    if (this.populationSize < 2) {
      throw new Error("populationSize must be even");
    }
  }

  async save() {
    this.print(
      "Saving optimizer",
      this._id || "",
      "| Generation",
      this.currentGeneration
    );
    this.lastUpdated = new Date();
    if (this._id) {
      await OptimizerModel.updateOne({ _id: this._id }, this);
      return;
    }
    const model = await OptimizerModel.create(this);
    this._id = model.id;
  }

  async run(obj: IRunOptimizerConfig = {}): Promise<void> {
    try {
      this.print("Optimization started", this._id);
      this.startTime = new Date();
      this.runPreconditions();
      await this.initializeBacktestBrokerage();
      this.status = StatusEnum.RUNNING;
      await this.save();
      await this.runGeneticAlgorithm(this.numGenerations);
      this.status = StatusEnum.COMPLETE;
      this.finishTime = new Date();
      await this.save();
    } catch (err) {
      debug("An error occurred during optimization");
      debug(err);
      this.status = StatusEnum.ERROR;
      this.finishTime = new Date();
      this.error = `${err.message}`;
      if (process.env.NODE_ENV !== "production") {
        this.error += `\n${err.stack}`;
      }
      await this.save();
    }
  }

  async initializeBacktestBrokerage() {
    const assets = [
      ...(await AssetFactory.getAssets([this.portfolio], this.brokerage)),
    ];
    if (this.baselineAsset) {
      assets.push(this.baselineAsset);
    }
    const promises = [];
    const beginningTime = this.portfolio.getEarliestDatePossible() - 7;
    for (const asset of assets) {
      let promise = await this.brokerage.getMarketHistory(
        asset,
        formatDate(date.addDays(this.startDate, beginningTime)),
        this.endDate
      );
      promises.push(promise);
    }
    await Promise.all(promises);
  }

  getNumParents() {
    const numParents = Math.floor(
      this.populationSize * this.crossoverProbability
    );
    const numSpontaneousAndElite = this.populationSize - numParents;
    const numElite = Math.floor(
      numSpontaneousAndElite * this.eliteSpontaneousRatio
    );
    const numSpontaneous = numSpontaneousAndElite - numElite;
    return { numParents, numSpontaneous, numElite };
  }

  async runGeneticAlgorithm(numGenerations: number) {
    await this.calculatePopulationFitness(this.state);
    this.sortFitness();
    this.addTrainingFitnessHistory();
    await this.runValidationTest();
    await this.save();
    for (let i = 0; i < numGenerations; i++) {
      this.print("Running generation", i);
      const parents: { motherIdx: number; fatherIdx: number }[] = [];
      const { numParents, numSpontaneous, numElite } = this.getNumParents();
      for (let j = 0; j < numParents; j++) {
        // - pick two portfolios by with a probaility equal to their fitness
        parents.push(this.selectParents());
      }
      const children = [
        ...this.generateChildren(parents),
        ...this.spontaneousGeneration(numSpontaneous),
        ...this.elitism(numElite),
      ];
      // add children to population
      await this.calculatePopulationFitness(children);
      this.state = this.state.concat(children);
      // sort population by fitness
      this.sortFitness();
      // cull population by fitness
      this.state = this.state.slice(0, this.populationSize);
      this.addTrainingFitnessHistory();
      this.currentGeneration += 1;
      this.print(
        "Training Fitness:",
        this.trainingFitnessHistory[this.trainingFitnessHistory.length - 1]
      );
      if (i % this.validationFrequency === 0) {
        await this.runValidationTest();
        this.print(
          "Validation Fitness:",
          this.validationFitnessHistory[
            this.validationFitnessHistory.length - 1
          ]
        );
      }
      if (i % this.saveFrequency === 0) {
        await this.save();
      }
      await sleep(this._GENERATION_TIMEOUT);
    }
    this.print("Optimization Done", this._id);
    this.print("Generation:", this.currentGeneration);
  }

  generateChildren(parents: { motherIdx: number; fatherIdx: number }[]) {
    const children: OptimizerStateElement[] = [];
    for (let i = 0; i < parents.length; i += 1) {
      const { motherIdx, fatherIdx } = parents[i];
      // - generate children using crossover of their optimizer vectors
      let child = this.crossover(motherIdx, fatherIdx);
      child = this.mutate(child);
      // - mutate child with some probability
      children.push(child);
    }
    return children;
  }

  mutate(child1: OptimizerStateElement): OptimizerStateElement {
    const child1Mutated = _.cloneDeep(child1);
    const mutationChance = Math.random();
    if (mutationChance < this.mutationProbability) {
      if (mutationChance < this.mutationProbability) {
        let i = Math.floor(Math.random() * child1Mutated.vector.length);
        child1Mutated.vector[i] = this.mutateVector(child1Mutated.vector[i]);
      } else {
        let i = Math.floor(Math.random() * child1Mutated.vector.length);
        let j = Math.floor(Math.random() * child1Mutated.vector.length);
        if (j > i) {
          [i, j] = [j, i];
        }
        for (let k = i; k <= j; k++) {
          child1Mutated.vector[k] = this.mutateVector(child1Mutated.vector[k]);
        }
      }
    }
    return child1Mutated;
  }

  mutateVector(vector: OptimizerVector): OptimizerVector {
    const newVector = _.cloneDeep(vector);
    newVector.value = this.generateRandomNumber(
      this.mutationIntensity,
      newVector.min,
      newVector.max,
      newVector.value,
      newVector.isInteger
    );
    return newVector;
  }

  crossover(motherIdx: number, fatherIdx: number): OptimizerStateElement {
    const mother = this.state[motherIdx];
    const father = this.state[fatherIdx];
    if (Math.random() < 0.5) {
      return this.nPointCrossover(mother, father);
    }
    return this.randomCrossover(father, mother);
  }

  nPointCrossover(
    father: OptimizerStateElement,
    mother: OptimizerStateElement
  ): OptimizerStateElement {
    // this is a n point crossover. we generate n points (up to 5)
    // we then remove duplicates and choose n points on the
    let nPoints = [];
    let numPoints = Math.floor(Math.random() * this.numberCrossoverPoints);
    for (let i = 0; i < numPoints; i++) {
      nPoints.push(Math.floor(Math.random() * father.vector.length));
    }
    nPoints.sort((a, b) => a - b);
    // remove duplicates in nPoints
    nPoints = nPoints.filter((item, pos) => nPoints.indexOf(item) === pos);
    let nPointsIdx = 0;
    let newState: OptimizerStateElement = _.cloneDeep(father);
    let crossover = true;
    for (let i = 0; i < father.vector.length; i++) {
      if (i > nPoints[nPointsIdx]) {
        nPointsIdx++;
        crossover = !crossover;
      }
      if (crossover) {
        newState.vector[i] = _.cloneDeep(mother.vector[i]);
      }
    }

    return newState;
  }

  randomCrossover(
    father: OptimizerStateElement,
    mother: OptimizerStateElement
  ): OptimizerStateElement {
    const result = _.cloneDeep(mother);
    for (let i = 0; i < result.vector.length; i++) {
      if (Math.random() < 0.5) {
        result.vector[i] = _.cloneDeep(father.vector[i]);
      }
    }
    return result;
  }

  selectParents(): { motherIdx: number; fatherIdx: number } {
    if (this.state.length < 2) {
      throw new Error("Not enough population to select parents");
    }
    const random = Math.random();
    let mother: number;
    let father: number;
    if (random < 0.5) {
      const fitnessSum = _.sum(this.state.map((s) => s.trainingFitness));
      mother = this.selectParentRouletteWheel(fitnessSum);
      father = this.selectParentRouletteWheel(fitnessSum);
    } else {
      mother = this.selectParentTournament();
      father = this.selectParentTournament();
    }
    if (father === mother) {
      father = father === this.state.length - 1 ? father - 1 : father + 1;
    }
    return { motherIdx: mother, fatherIdx: father };
  }

  selectParentRouletteWheel(fitnessSum: number): number {
    const pick = Math.random() * fitnessSum;
    let sum = 0;
    for (let i = 0; i < this.state.length; i++) {
      sum += this.state[i].trainingFitness[this.fitnessFunction];
      if (sum >= pick) {
        return i;
      }
    }
    return this.state.length - 1;
  }

  selectParentTournament(): number {
    let pick = Math.floor(Math.random() * this.state.length);
    return pick;
  }

  public sortFitness() {
    const multiplier = [FitnessEnum.maxDrawdown].includes(this.fitnessFunction)
      ? 1
      : -1;
    this.state = _.sortBy(
      this.state,
      (s) => multiplier * s.trainingFitness[this.fitnessFunction]
    );
  }

  public addTrainingFitnessHistory() {
    const fitness = this.state
      .map((s) => s.trainingFitness)
      .reduce((acc, cur) => {
        return acc.add(cur);
      }, new Statistics())
      .divide(this.state.length);
    this.trainingFitnessHistory.push(fitness);
  }

  public addValidationFitnessHistory() {
    const fitness = this.state
      .map((s) => s.validationFitness)
      .reduce((acc, cur) => {
        return acc.add(cur);
      }, new Statistics())
      .divide(this.state.length);
    this.validationFitnessHistory.push(fitness);
  }

  public async runValidationTest() {
    const tmp: Promise<Statistics>[] = [];
    for (let i = 0; i < this.state.length; i++) {
      let statistics = this.createValidationBacktest(this.state[i].vector).then(
        (c) => this.runBacktestAndCalculateFitness(c)
      );
      tmp.push(statistics);
    }
    const statistics = await batchPromises(
      tmp,
      this._BATCH_SIZE,
      this._BATCH_TIMEOUT
    );
    for (let i = 0; i < statistics.length; i++) {
      this.state[i].validationFitness = new Statistics(statistics[i]);
    }
    this.addValidationFitnessHistory();
  }

  public async createBacktest(
    vector: OptimizerVector[],
    startDate: Date,
    endDate: Date,
    brokerage: BacktestBrokerage
  ) {
    const portfolio = MockPortfolio.newBacktest(this.portfolio);
    portfolio.name = Math.random().toString();
    Optimizer.setOptimizerVector(portfolio, vector);
    return Backtester.create({
      startDate: startDate,
      endDate: endDate,
      portfolio,
      userId: this.userId,
      name: `Backtester ${portfolio.name}`,
      brokerage: brokerage,
      interval: this.interval,
      saveOnInitialization: false,
      validateOnInitialization: false,
    });
  }

  public async createTrainingBacktest(vector: OptimizerVector[]) {
    this.fixStateElement(vector);
    const randomStartDelta = randrange(
      0,
      Math.max(this.trainingDateDifference - this.trainingWindowLength - 1, 0),
      true
    );
    const startDate = date.addDays(this.trainingStartDate, randomStartDelta);
    let endDate = date.addDays(startDate, this.trainingWindowLength);
    if ((endDate as any) > this.trainingEndDate) {
      endDate = this.trainingEndDate;
    }
    return this.createBacktest(
      vector,
      startDate,
      endDate,
      new DataTransformerBacktestBrokerage(this.brokerage, this.generatedData, {
        startDate,
        endDate,
      })
    );
  }

  public async createValidationBacktest(vector: OptimizerVector[]) {
    return this.createBacktest(
      vector,
      this.validationStartDate,
      this.validationEndDate,
      this.brokerage
    );
  }

  public async calculatePopulationFitness(state: OptimizerState) {
    const tmp: Promise<Statistics>[] = [];
    for (let i = 0; i < state.length; i++) {
      let { vector } = state[i];
      let fitness = this.createTrainingBacktest(vector).then((b) =>
        this.runBacktestAndCalculateFitness(b)
      );
      tmp.push(fitness);
    }
    const fitnesses = await batchPromises(
      tmp,
      this._BATCH_SIZE,
      this._BATCH_TIMEOUT
    );
    for (let i = 0; i < state.length; i++) {
      state[i].trainingFitness = fitnesses[i];
    }
  }

  private async runBacktestAndCalculateFitness(
    backtest: Backtester
  ): Promise<Statistics> {
    await backtest.run({ saveOnRun: false, generateBaseline: false });
    if (backtest.status === StatusEnum.ERROR) {
      throw new Error(backtest.error);
    }
    return new Statistics(backtest.statistics);
  }

  /**
   * Mutates the child and fixes the min/max value depending on allocation type
   *
   * @param child: OptimizerStateElement
   */
  private fixAllocationFields(vector: OptimizerVector[]) {
    const allocationValues = Object.values(AllocationEnum);
    // fix allocation element
    for (let i = 0; i < vector.length; i++) {
      const v = vector[i];
      const containsAllocation =
        v.fieldName.includes("buyAmount.amount") ||
        v.fieldName.includes("sellAmount.amount") ||
        v.fieldName.includes("allocation.amount");
      if (containsAllocation) {
        // find the type field
        const fieldNameArray = v.fieldName.split(".");
        const idx = fieldNameArray.findIndex(
          (s) =>
            s.includes("buyAmount") ||
            s.includes("sellAmount") ||
            s.includes("allocation")
        );
        fieldNameArray[idx + 1] = "type";
        // if the type field is percent, then fix the value to be between 0 and 100
        const typeFieldName = fieldNameArray.join(".");
        const typeField = vector.find((s) => {
          return (
            s.fieldName === typeFieldName && s.strategyIdx === v.strategyIdx
          );
        });
        if (!typeField) {
          throw new Error(`Could not find type field ${typeFieldName}`);
        }
        if (
          allocationValues[typeField.value] ===
            AllocationEnum.PERCENT_OF_BUYING_POWER ||
          allocationValues[typeField.value] ===
            AllocationEnum.PERCENT_OF_PORTFOLIO
        ) {
          v.max = 100;
        }
        if (
          allocationValues[typeField.value] ===
          AllocationEnum.PERCENT_OF_CURRENT_POSITIONS
        ) {
          v.max = 200;
        }
        if (allocationValues[typeField.value] === AllocationEnum.DOLLARS) {
          v.max = 2 * this.portfolio.initialValue;
        }
        if (allocationValues[typeField.value] === AllocationEnum.NUM_ASSETS) {
          v.max = 0.2 * this.portfolio.initialValue;
        }
      }
    }
  }

  public fixStateElement(vector: OptimizerVector[]) {
    this.fixAllocationFields(vector);
    vector.forEach((ele) => {
      if (ele.value < ele.min) {
        ele.value = ele.min;
      }
      if (ele.value > ele.max) {
        ele.value = ele.max;
      }
    });
  }

  /**
   * Randomize strategy conditions, strategy buyAmount, and strategy sellAmount for optimizer
   *
   * @param randomizationIntensity: a number between 0 to 1. 0 means no randomization, 1 means completely random
   */
  public randomizeStrategies(
    mockPortfolio: MockPortfolio,
    randomizationIntensity: number
  ): OptimizerVector[] {
    const vector = Optimizer.getOptimizerVector(mockPortfolio);
    for (let i = 0; i < vector.length; i++) {
      let { max, min, isInteger, value } = vector[i];
      let random = this.generateRandomNumber(
        randomizationIntensity,
        min,
        max,
        value,
        isInteger
      );
      let newElement = _.cloneDeep(vector[i]);
      newElement.value = random;
      vector[i] = newElement;
    }
    Optimizer.setOptimizerVector(mockPortfolio, vector);
    return vector;
  }

  private generateRandomNumber(
    randomizationIntensity: number,
    min: number,
    max: number,
    value: number,
    isInteger: boolean
  ) {
    let randomNumber = randrange(min, max, false);
    let inverseRandomizationIntensity = 1 - randomizationIntensity;
    let randomWithIntensity = randomNumber * randomizationIntensity;
    let currentValueWithIntensity = value * inverseRandomizationIntensity;
    let finalValue =
      Math.random() < 0.5
        ? currentValueWithIntensity + randomWithIntensity
        : currentValueWithIntensity - randomWithIntensity;
    if (isInteger) {
      finalValue = Math.round(finalValue);
    } else {
      finalValue = round(finalValue, 2);
    }
    if (finalValue < min) {
      finalValue = min;
    }
    if (finalValue > max) {
      finalValue = max;
    }
    return finalValue;
  }

  /**
   * A vector in the following order:
   * - strategy.buyAmount.amount
   * - strategy.buyAmount.type
   * - strategy.sellAmount.amount
   * - strategy.sellAmount.type
   * - condition form fields
   */
  public static getOptimizerVector(
    mockPortfolio: MockPortfolio
  ): OptimizerVector[] {
    const strategies = mockPortfolio.strategies;
    const buyAmountVector: OptimizerVector[] = this.allocationToVector(
      mockPortfolio,
      "buy"
    );
    const sellAmountVector: OptimizerVector[] = this.allocationToVector(
      mockPortfolio,
      "sell"
    );
    const buyConditionsVector: OptimizerVector[] = this.getConditionsVector(
      strategies,
      "buy"
    );
    const sellConditionsVector: OptimizerVector[] = this.getConditionsVector(
      strategies,
      "sell"
    );
    return [
      ...buyAmountVector,
      ...sellAmountVector,
      ...buyConditionsVector,
      ...sellConditionsVector,
    ];
  }

  private static allocationToVector = (
    mockPortfolio: MockPortfolio,
    side: "buy" | "sell"
  ) => {
    const allocationValues = Object.values(AllocationEnum);
    return mockPortfolio.strategies
      .map((strategy, strategyIdx) => {
        const allocation =
          side === "buy" ? strategy.buyAmount : strategy.sellAmount;
        return [
          {
            fieldName: `${side}Amount.amount`,
            value: allocation.amount,
            isInteger: false,
            max:
              allocation.type === AllocationEnum.DOLLARS
                ? 2 * mockPortfolio.initialValue
                : allocation.type === AllocationEnum.NUM_ASSETS
                ? 0.2 * mockPortfolio.initialValue
                : allocation.type ===
                  AllocationEnum.PERCENT_OF_CURRENT_POSITIONS
                ? 200
                : 100,
            min: 0,
            strategyIdx,
            type: FieldEnum.NUMBER,
            values: undefined,
          },
          {
            fieldName: `${side}Amount.type`,
            value: allocationValues.indexOf(allocation.type),
            isInteger: true,
            max: allocationValues.length - 1,
            values: allocationValues,
            min: 0,
            strategyIdx,
            type: FieldEnum.SELECT,
          },
        ];
      })
      .flat();
  };

  private static formGroupToVector = (
    formGroup: FormGroup,
    idx: number,
    namePrefix: string,
    strategyIdx: number
  ) => {
    return formGroup.fields.map((field) => {
      if (
        !(field instanceof TextField) &&
        !EXCLUDED_FIELDS.includes(field.name)
      ) {
        const value =
          field instanceof SelectField
            ? (field as SelectField).values.indexOf(field.value)
            : ((field as NumberField).value as number);
        return {
          type: field.fieldType,
          values:
            field instanceof SelectField
              ? (field as SelectField).values
              : undefined,
          strategyIdx,
          fieldName: `${namePrefix}[${idx}].${field.name}`,
          value,
          isInteger: field instanceof SelectField ? true : false,
          max:
            field instanceof SelectField
              ? (field as SelectField).values.length - 1
              : field instanceof NumberField
              ? (field as NumberField).max
              : 100,
          min:
            field instanceof SelectField
              ? 0
              : field instanceof NumberField
              ? (field as NumberField).min
              : 0,
        };
      }
      return null;
    });
  };

  private static conditionToVector(obj: {
    condition: AbstractCondition;
    strategyIdx: number;
    conditionIdx: number;
    path: string;
  }): OptimizerVector[] {
    const { condition, strategyIdx, conditionIdx } = obj;
    const { path } = obj;
    const result = condition
      .getForm()
      .fields.map((group) => {
        return this.formGroupToVector(group, conditionIdx, path, strategyIdx);
      })
      .flat();
    if ("conditions" in condition) {
      const compoundResult = (condition as AndCondition).conditions
        .map((c, idx) => {
          return this.conditionToVector({
            condition: c,
            strategyIdx,
            conditionIdx: idx,
            path: `${path}[${conditionIdx}].conditions`,
          });
        })
        .flat();
      return [...result, ...compoundResult];
    }
    return result;
  }

  private static getConditionsVector(
    strategies: IStrategy[],
    side: "buy" | "sell"
  ) {
    return strategies
      .map((strategy, strategyIdx) => {
        const conditionsObjs: ICondition[] =
          side === "buy"
            ? strategy.buyingConditions
            : strategy.sellingConditions;
        const conditions = conditionsObjs.map((c) =>
          ConditionFactory.create(c)
        );
        return conditions.map((condition, idx) => {
          const result = [];
          result.push(
            ...this.conditionToVector({
              condition,
              conditionIdx: idx,
              strategyIdx,
              path: `${side}ingConditions`,
            })
          );
          return result;
        });
      })
      .flat()
      .flat()
      .filter((element) => element !== null);
  }

  /**
   *
   * @param vector: a number[] retrieved from a portfolio that has the same strategies
   *
   * Precondition: vector is obtained from a portfolio with the same exact strategies/conditions
   */
  public static setOptimizerVector(
    mockPortfolio: MockPortfolio,
    vector: OptimizerVector[]
  ) {
    const strategies = mockPortfolio.strategies;
    this.setAllocationVector(strategies, vector);
    this.setConditionVector(strategies, vector);
  }

  private static setAllocationVector(
    strategies: IStrategy[],
    vector: OptimizerVector[]
  ) {
    const beforeValues = [];
    for (let i = 0; i < strategies.length; i++) {
      let strategyVector = vector.filter((ele) => ele.strategyIdx === i);
      let strategy = strategies[i];
      beforeValues.push(strategy.buyAmount);
      beforeValues.push(strategy.sellAmount);
      strategy.buyAmount.amount = strategyVector[0].value;
      strategy.buyAmount.type = strategyVector[1].values[
        strategyVector[1].value
      ] as AllocationEnum;
      strategy.sellAmount.amount = strategyVector[2].value;
      strategy.sellAmount.type = strategyVector[3].values[
        strategyVector[3].value
      ] as AllocationEnum;
      if (!strategy.buyAmount.type || !strategy.sellAmount.type) {
        throw new ValidationError(
          "Internal optimization error; problem with setAllocationVector " +
            JSON.stringify(beforeValues) +
            " \n\n" +
            JSON.stringify(vector)
        );
      }
    }
  }

  private static setConditionVector(
    strategies: IStrategy[],
    vector: OptimizerVector[]
  ) {
    let regex = /(\w+)\.*(\w*\[\d+\])\.(.+)/;
    for (let i = 0; i < strategies.length; i++) {
      let strategy = strategies[i];
      let strategyVector = vector
        .filter((ele) => ele.strategyIdx === i)
        .slice(4);
      let buyingConditions = strategy.buyingConditions;
      let sellingConditions = strategy.sellingConditions;
      strategyVector.forEach((f) => {
        let match = f.fieldName.match(regex);
        let path = match[2];
        let field = match[3];
        let condition: AbstractCondition;
        let value: any = f.value;
        if (!_.isNil(f.values) && f.type === FieldEnum.SELECT) {
          value = f.values[value];
        }
        if (f.type === FieldEnum.NUMBER) {
          value = Number(value);
        }
        if (match[1] === "buyingConditions") {
          condition = _.get(buyingConditions, path);
        } else if (match[1] === "sellingConditions") {
          condition = _.get(sellingConditions, path);
        } else {
          throw new Error(`Internal optimization error`);
        }
        let groups = condition.getForm().fields;
        const cmpConditionMatch = field.match(/conditions\[\d+\]/);
        if (cmpConditionMatch) {
          let compoundCondition = _.get(condition, `${cmpConditionMatch[0]}`);
          groups = compoundCondition.getForm().fields;
        }
        let targetGroup: AbstractField;
        for (let i = 0; i < groups.length; i++) {
          targetGroup = groups[i].fields.find((ele) => {
            let bareField = field;
            if (field.includes("conditions[")) {
              bareField = field.substring(field.indexOf(".") + 1);
            }
            return ele.name === bareField;
          });
          if (targetGroup) {
            targetGroup.value = value;
            break;
          }
        }
        _.set(condition, field, value);
        condition.form = condition.getForm();
        if (condition.conditions && condition.conditions) {
          condition.conditions.forEach((c) => {
            c.form = c.getForm();
          });
        }
      });
    }
  }

  elitism(count: number): OptimizerState {
    return cloneDeep(this.state.slice(0, count));
  }

  spontaneousGeneration(count: number): OptimizerState {
    const children: OptimizerStateElement[] = [];
    for (let i = 0; i < count; i += 1) {
      // - generate random child
      const state = {
        vector: this.randomizeStrategies(
          MockPortfolio.newBacktest(this.portfolio),
          1
        ),
        trainingFitness: new Statistics(),
        validationFitness: new Statistics(),
      };
      children.push(state);
    }
    return children;
  }

  static async findOne(
    optimizerId: Id,
    userId: Id,
    brokerage: AbstractBrokerage,
    pageNumber?: number
  ): Promise<Optimizer> {
    let pageFilter = {};
    if (pageNumber) {
      pageFilter = {
        state: {
          $slice: [(pageNumber - 1) * STATE_PAGE_SIZE, STATE_PAGE_SIZE],
        },
      };
    }
    return OptimizerModel.findOne(
      { userId, _id: optimizerId },
      pageFilter
    ).then((model) => {
      if (!model) {
        throw new Error("Optimizer not found");
      }
      const optimizer = new Optimizer({
        ...model.toObject(),
        brokerage: new BacktestBrokerage({
          ...brokerage,
          brokerage: brokerage,
        }),
      });
      optimizer.currentGeneration = model.currentGeneration;
      return optimizer;
    });
  }

  public static async killall(
    obj: { userId?: Id },
    errMessage: string
  ): Promise<void> {
    return OptimizerModel.find(
      {
        ...obj,
        status: { $in: [StatusEnum.PENDING, StatusEnum.RUNNING] },
      },
      { status: 1, error: 1, lastUpdated: 1, finishTime: 1 }
    ).then(async (models) => {
      const tmp = [];
      for (let model of models) {
        model.status = StatusEnum.ERROR;
        model.error = errMessage;
        const d = new Date();
        model.lastUpdated = d;
        model.finishTime = d;
        tmp.push(model.save());
      }
      await Promise.all(tmp);
    });
  }

  public static async find(
    portfolioId: Id,
    userId: Id,
    limit: number
  ): Promise<IOptimizer[]> {
    let pageFilter = {
      state: {
        $slice: [0, STATE_PAGE_SIZE],
      },
    };

    return OptimizerModel.find({ userId, portfolioId }, pageFilter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .then((models) => {
        return models.map((model) => {
          return model.toObject();
        });
      });
  }

  public static async findSummaries(
    portfolioId: Id,
    userId: Id,
    limit: number
  ): Promise<OptimizerSummary[]> {
    return OptimizerModel.find(
      { userId, portfolioId },
      { name: 1, startDate: 1, endDate: 1, status: 1, error: 1 }
    )
      .sort({ createdAt: -1 })
      .limit(limit)
      .then((models) => {
        return models.map((model) => {
          return Optimizer.toSummary(model);
        });
      });
  }

  createWorker(brokerage: IBrokerage) {
    const workerData = {
      userId: this.userId.toString(),
      brokerage: brokerage,
      optimizerId: this._id.toString(),
    };
    let worker = new Worker(
      "./dist/controller/optimizationController/worker.js",
      {
        workerData,
      }
    );
    worker.on("error", (message) => {
      debug("An error occurred in worker: ", message);
    });
    return worker;
  }

  public getForm(): FormControl {
    const formControl = new FormControl();
    formControl.addGroup(
      new FormGroup([
        new TextField({
          name: "name",
          label: "Name",
          helperText: "Unique name identifying describing the optimizer",
          value: this.name,
          required: false,
        }),
      ])
    );
    formControl.addGroup(
      new FormGroup([
        new DateField({
          name: "startDate",
          label: "Start Date",
          helperText: "Date to start the optimizer",
          value: this.startDate,
          required: true,
        }),
        new DateField({
          name: "endDate",
          label: "End Date",
          helperText: "Date to end the optimizer",
          value: this.endDate,
          required: true,
        }),
      ])
    );
    formControl.addGroup(
      new FormGroup([
        new NumberField(
          {
            name: "mutationIntensity",
            label: "Mutation Intensity",
            helperText: "Intensity of mutation",
            value: this.mutationIntensity,
            required: false,
          },
          0,
          1
        ),
        new NumberField(
          {
            name: "mutationProbability",
            label: "Mutation Probability",
            helperText: "Probability of mutation",
            value: this.mutationProbability,
            required: false,
          },
          0,
          1
        ),
      ])
    );
    formControl.addGroup(
      new FormGroup([
        new NumberField(
          {
            name: "numGenerations",
            label: "Num Generations",
            helperText: "Number of generations to run per optimizer",
            value: this.numGenerations,
            required: false,
          },
          1,
          1000
        ),
        new SelectField(Object.values(FitnessEnum), {
          name: "fitnessFunction",
          label: "Fitness Function",
          helperText: "The fitness function to use during optimization",
          value: this.fitnessFunction,
        }),
      ])
    );
    formControl.addGroup(
      new FormGroup([
        new NumberField(
          {
            name: "populationSize",
            label: "Population Size",
            helperText: "Number of individuals",
            value: this.populationSize,
            required: true,
          },
          3,
          1000
        ),
        new NumberField(
          {
            name: "trainValidationRatio",
            label: "Train Test Split",
            helperText: "The percent of the data to use for training",
            value: this.trainValidationRatio,
            required: false,
          },
          0.5,
          1
        ),
      ])
    );
    formControl.addGroup(
      new FormGroup([
        // new NumberField(
        //   {
        //     name: "trainingWindowLength",
        //     label: "Window Length",
        //     helperText: "Each backtest will use this many days of data",
        //     value: this.trainingWindowLength,
        //     required: false,
        //   },
        //   2,
        //   9999
        // ),
        new NumberField(
          {
            name: "validationFrequency",
            label: "Validation Frequency",
            helperText: "Save every x generations",
            value: this.validationFrequency,
            required: false,
          },
          1,
          100
        ),
      ])
    );
    // formControl.addGroup(
    //   new FormGroup([
    //     new NumberField(
    //       {
    //         name: "generatedData.ratio",
    //         label: "Generated Data Ratio",
    //         helperText:
    //           "The percent of data that is simulated from the returns",
    //         value: this.generatedData.ratio,
    //         required: false,
    //       },
    //       0,
    //       100
    //     ),
    //     new NumberField(
    //       {
    //         name: "generatedData.meanDeviationValue",
    //         label: "Generated Data Percent Value",
    //         helperText: "The percent deviation from the mean per timestep",
    //         value: this.generatedData.meanDeviationValue,
    //         required: false,
    //       },
    //       -100,
    //       100
    //     ),
    //   ])
    // );
    return formControl;
  }
}

export default Optimizer;
