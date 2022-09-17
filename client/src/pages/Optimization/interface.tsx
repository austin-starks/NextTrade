import {
  FitnessEnum,
  IGeneratedData,
  IStatistics,
  StatusEnum,
  TimeIntervalEnum,
  timestamp,
} from "../../services/outsideInterfaces";
import { AbstractPortfolio } from "../Portfolios/interface";

interface OptimizerVector {
  fieldName: string;
  value: number;
  isInteger: boolean;
  max: number;
  min: number;
  strategyIdx: number;
}

export interface OptimizerStateElement {
  trainingFitness: IStatistics;
  validationFitness: IStatistics;
  vector: OptimizerVector[];
  portfolio: AbstractPortfolio;
}

export type OptimizerState = OptimizerStateElement[];

export interface IOptimizer {
  _id: string;
  trainingStartDate: Date;
  trainingEndDate: Date;
  validationStartDate: Date;
  validationEndDate: Date;
  name: string;
  startDate: Date;
  endDate: Date;
  populationSize: number;
  status: StatusEnum;
  fitnessFunction: FitnessEnum;
  mutationProbability: number;
  portfolio: AbstractPortfolio;
  interval: TimeIntervalEnum;
  numGenerations: number;
  state: OptimizerState;
  portfolioId: string;
  error: string;
  lastUpdated: Date;
  saveFrequency?: number;
  validationFrequency?: number;
  trainingWindowLength?: number;
  trainValidationRatio?: number;
  comparisonValidationHistory: timestamp[];
  trainingFitnessHistory: IStatistics[];
  validationFitnessHistory: IStatistics[];
  currentGeneration: number;
  finishTime?: Date;
  startTime?: Date;
  generatedData?: IGeneratedData;
}

export interface OptimizerSummary {
  _id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: StatusEnum;
  error: string;
}
