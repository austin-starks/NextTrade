import axios from "axios";
import { CompoundCondition, ConditionEnum } from "../pages/Condition/interface";
import { OptimizerSummary } from "../pages/Optimization/interface";
import { AbstractPortfolio, IPortfolio } from "../pages/Portfolios/interface";
import { IStrategy } from "../pages/Strategies/interface";
import { IFormControl } from "./outsideInterfaces";

export interface ValidateConditionResponse {
  message: string;
}

interface RegistrationData {
  firstName: string;
  lastName: string;
  password: string;
  email: string;
  remember: boolean;
}

interface LoginData {
  email: string;
  password: string;
  remember: boolean;
}

interface BacktestData {}

export const register = (data: RegistrationData) =>
  axios.post(`/api/user/register`, data);
export const login = (data: LoginData) => axios.post(`/api/user/login`, data);
export const ping = () => axios.get(`/api/protected`);
export const logout = () => axios.post(`/api/user/logout`, {});
export const search = (query: string) => axios.get(`/api/search?q=${query}`);
export const getStockData = (stock: string) => axios.get(`/api/stock/${stock}`);
export const getPortfolioHistory = (portfolioId?: string) => {
  return axios.get(`/api/portfolio/${portfolioId || "main"}/history`);
};
export const getOptimizerForm = (optimizerId?: string) =>
  axios.get(`/api/optimize/${optimizerId ? `${optimizerId}/` : ""}form`);
export const editOptimizer = (
  optimizerId: string,
  data: { form: IFormControl }
) => axios.post(`/api/optimize/${optimizerId}`, data);
export const optimize = (portfolioId: string, data: { form: IFormControl }) =>
  axios.post(`/api/optimize/portfolio/${portfolioId}`, data);
export const getOptimizers = (portfolioId: string) =>
  axios.get(`/api/optimize/portfolio/${portfolioId}`);
export const getOptimizerSummaries = (optimizers: OptimizerSummary[]) =>
  axios.get(`/api/optimize/summaries`, {
    params: {
      summaries: optimizers.map((o) => o._id).join(","),
    },
  });

export const getOptimizerResults = (id: string) =>
  axios.get(`/api/optimize/${id}`);

export const resumeOptimizer = (id: string) =>
  axios.post(`/api/optimize/${id}/run`, {});

export const cancelOptimization = (id: string) =>
  axios.post(`/api/optimize/${id}/cancel`, {});

export const getAssetHistory = (
  assetName: string,
  assetType: "stock" | "crypto"
) => {
  return axios.get(`/api/${assetType}/${assetName}/history`);
};
export const getPortfolios = () => axios.get(`/api/portfolio`);
export const createPortfolio = (p: IPortfolio) =>
  axios.post(`/api/portfolio`, p);
export const editPortfolio = (portfolioId: string, data: IPortfolio) =>
  axios.post(`/api/portfolio/${portfolioId}`, data);

export const editPortfolioFromMock = (
  portfolioId: string,
  data: AbstractPortfolio
) => axios.post(`/api/portfolio/${portfolioId}/mock`, { portfolio: data });
export const getPortfolio = (id?: string) =>
  axios.get(`/api/portfolio/${id || "main"}`);
export const getStrategies = () => axios.get(`/api/strategy`);
export const savePortfolioStrategies = (
  portfolioId: string,
  strategy: IStrategy
) => axios.post(`/api/portfolio/${portfolioId}/strategies`, strategy);
export const deletePortfolioStrategy = (
  portfolioId: string,
  strategyId: string
) => axios.delete(`/api/portfolio/${portfolioId}/strategies/${strategyId}`);
export const getConditions = () => axios.get(`/api/condition/`);

export const createConditionFromForm = (data: {
  id?: string;
  form: IFormControl;
  type: ConditionEnum;
}) => axios.post(`/api/condition`, data);
export const createCompoundCondition = (data: CompoundCondition) =>
  axios.post(`/api/condition/compound`, data);
export const deleteCondition = (id: string) =>
  axios.delete(`/api/condition/${id}`);
export const createBacktest = (portfolioId: string, data: BacktestData) =>
  axios.post(`/api/backtest`, { ...data, portfolio: portfolioId });
export const getBacktests = (portfolioId?: string) =>
  axios.get(`/api/backtest/portfolio/${portfolioId || "main"}`);
export const getBacktest = (id: string) => axios.get(`/api/backtest/${id}`);
export const runBacktest = (id: string) => axios.get(`/api/backtest/${id}/run`);

export const catchErrorCallback = (
  err: any,
  authCb: (arg: string) => void,
  bannerCb: (arg: { message: string; severity: "error" | "success" }) => void
) => {
  const errMessage =
    err.response.data.message || err.response.data || err.message;
  if (err.response.status === 404) {
    bannerCb({
      message: "Client Error (404)",
      severity: "error",
    });
  } else if (err.response.status === 401 || err.response.status === 403) {
    logout().then(() => {
      authCb("/");
    });
  } else if (errMessage.toLowerCase().includes("proxy")) {
    bannerCb({
      message: "Internal Server Error. Please try again later.",
      severity: "error",
    });
  } else if (err instanceof Error) {
    bannerCb({
      message: errMessage,
      severity: "error",
    });
    return;
  } else {
    bannerCb({ message: errMessage, severity: "error" });
  }
};
