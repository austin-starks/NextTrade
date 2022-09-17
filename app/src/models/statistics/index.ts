export interface IStatistics {
  sortino: number;
  sharpe: number;
  percentChange: number;
  totalChange: number;
  averageChange: number;
  maxDrawdown: number;
}

class Statistics implements IStatistics {
  sortino: number;
  sharpe: number;
  percentChange: number;
  totalChange: number;
  averageChange: number;
  maxDrawdown: number;

  constructor(obj?: IStatistics) {
    this.sortino = obj?.sortino || 0;
    this.sharpe = obj?.sharpe || 0;
    this.percentChange = obj?.percentChange || 0;
    this.totalChange = obj?.totalChange || 0;
    this.averageChange = obj?.averageChange || 0;
    this.maxDrawdown = obj?.maxDrawdown || 0;
  }
  add(s: IStatistics): Statistics {
    const copy = new Statistics(this);
    copy.sortino = copy.sortino + s.sortino;
    copy.sharpe = copy.sharpe + s.sharpe;
    copy.percentChange = copy.percentChange + s.percentChange;
    copy.totalChange = copy.totalChange + s.totalChange;
    copy.averageChange = copy.averageChange + s.averageChange;
    copy.maxDrawdown = copy.maxDrawdown + s.maxDrawdown;
    return copy;
  }
  divide(n: number): Statistics {
    const copy = new Statistics(this);
    copy.sortino = copy.sortino / n;
    copy.sharpe = copy.sharpe / n;
    copy.percentChange = copy.percentChange / n;
    copy.totalChange = copy.totalChange / n;
    copy.averageChange = copy.averageChange / n;
    copy.maxDrawdown = copy.maxDrawdown / n;
    return copy;
  }

  calculateStatistics(
    finalValue: number,
    initialValue: number,
    valueHistory: { value: number }[],
    deltaHistory: { value: number }[]
  ) {
    const riskFreeReturn = initialValue * 1.001 * valueHistory.length;
    const riskFreePercent = (riskFreeReturn - initialValue) / initialValue;
    const totalChange = finalValue - initialValue;
    const meanChange = totalChange / valueHistory.length;
    const meanValue =
      valueHistory.reduce((a, b) => a + b.value, 0) / valueHistory.length;
    const variance = deltaHistory.reduce((acc, curr) => {
      return acc + Math.pow(curr.value - meanValue, 2);
    }, 0);
    const sd = Math.sqrt(variance / deltaHistory.length);
    const negativeReturns = deltaHistory.filter((h) => h.value < 0);
    const negativeReturnVariance = negativeReturns.reduce((acc, curr) => {
      return acc + Math.pow(curr.value - meanValue, 2);
    }, 0);
    const negativeReturnSd = Math.sqrt(
      negativeReturnVariance / negativeReturns.length
    );
    this.totalChange = totalChange;
    this.percentChange = (totalChange / initialValue) * 100;
    this.averageChange = meanChange;
    this.sharpe =
      sd === 0 || deltaHistory.length === 0
        ? 0
        : (this.percentChange - riskFreePercent) / sd;
    this.sortino =
      negativeReturnSd === 0 || negativeReturns.length === 0
        ? 0
        : (totalChange - riskFreePercent) / negativeReturnSd;
    this.maxDrawdown = this.calculateMaxDrawdown(valueHistory);
  }

  public calculateMaxDrawdown(history: { value: number }[]) {
    let peak = Number.NEGATIVE_INFINITY;
    let trough = Number.POSITIVE_INFINITY;
    let maxDrawdown = 0;
    for (let i = 0; i < history.length; i++) {
      const delta = history[i].value;
      if (delta > peak) {
        peak = delta;
        trough = delta;
      }
      if (delta < trough) {
        trough = delta;
      }
      if (peak - trough > maxDrawdown) {
        maxDrawdown = peak - trough;
      }
    }
    return maxDrawdown;
  }
}

export default Statistics;
