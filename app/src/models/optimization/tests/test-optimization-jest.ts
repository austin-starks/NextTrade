import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
} from "@jest/globals";
import Optimizer from "..";
import DbHandler from "../../../services/db";
import { MarketDataArray } from "../../../utils";
import {
  AllocationEnum,
  BrokerageEnum,
  Comparator,
  FitnessEnum,
  StatisticsEnum,
  TimeIntervalEnum,
} from "../../../utils/enums";
import { PurchaseAndSaleAllocation } from "../../allocation";
import { Stock } from "../../asset";
import BrokergeFactory, {
  BacktestBrokerage,
  TestBrokerage,
} from "../../brokerage";
import {
  AndCondition,
  HavePositionCondition,
  MovingAveragePriceCondition,
  PortfolioIsProfitableCondition,
  PositionPercentChangeCondition,
} from "../../conditions";
import BuyingPowerIsCondition from "../../conditions/buyingPowerIs";
import PortfolioValueIsCondition from "../../conditions/portfolioValueIs";
import ThenCondition from "../../conditions/then";
import Portfolio, { MockPortfolio } from "../../portfolio";
import Strategy, { IStrategy } from "../../strategy";
import { Duration } from "../../time";
import User from "../../user";

const dbHandler: DbHandler = new DbHandler("test");
var user: User;
var portfolio: Portfolio;
var brokerage: TestBrokerage;

beforeAll(async () => {
  await dbHandler.connect();
});

beforeEach(async () => {
  const userInfo = {
    password: "12345678",
    phoneNumber: "555-555-5555",
    firstName: "John",
    lastName: "Doe",

    email: "example@gmail.com",
    brokerage: {
      name: BrokerageEnum.TEST,
      authDetails: null,
    },
  };
  user = new User(userInfo);
  await user.save();
  portfolio = new Portfolio({
    userId: user.id,
    name: "First automated trading strategy",
    initialValue: 2000,
  });
  await portfolio.save();
  brokerage = BrokergeFactory.create({
    name: BrokerageEnum.TEST,
    authDetails: null,
  }) as TestBrokerage;
  const asset = new Stock("NVDA");
  const marketData: MarketDataArray = [
    {
      date: "2020-01-01",
      open: 120,
      close: 125,
      high: 126,
      low: 120,
      volume: 10000,
    },
    {
      date: "2020-01-02",
      open: 125,
      close: 126,
      high: 130,
      low: 124,
      volume: 11000,
    },
  ];
  brokerage.constructRealisticMarketDict(asset, marketData);
});

afterEach(async () => await dbHandler.clearDatabase());

afterAll(async () => {
  await dbHandler.closeDatabase();
});

describe("Testing optimizer functionality", () => {
  test("Test optimizer functionality", async () => {
    const backtestBrokerage = new BacktestBrokerage({ brokerage });
    const mockPortfolio = new MockPortfolio(portfolio);
    const optimizer = new Optimizer({
      name: "Test Optimizer",
      portfolio: mockPortfolio,
      brokerage: backtestBrokerage,
      interval: TimeIntervalEnum.DAY,
      userId: user.id,
      startDate: new Date("2020-01-01"),
      endDate: new Date("2020-01-31"),
      populationSize: 10,
      numGenerations: 1,
      fitnessFunction: FitnessEnum.percentChange,
    });
    expect(optimizer.state.length).toBe(10);
  });

  test("Can get an optimizer vector of a portfolio with no strategies", async () => {
    const mockPortfolio = new MockPortfolio(portfolio);
    const vector = Optimizer.getOptimizerVector(mockPortfolio);
    expect(vector.length).toBe(0);
  });

  test("Can get an optimizer vector of a portfolio with a strategy and no conditions", async () => {
    const mockPortfolio = new MockPortfolio(portfolio);
    const strategyObj: IStrategy = {
      name: "NVDA Buy Low Sell High",
      userId: user.id,
      targetAsset: new Stock("NVDA"),
      buyingConditions: [],
      sellingConditions: [],
      buyAmount: new PurchaseAndSaleAllocation({
        amount: 2000,
        type: AllocationEnum.DOLLARS,
      }),
      sellAmount: new PurchaseAndSaleAllocation({
        amount: 500,
        type: AllocationEnum.DOLLARS,
      }),
    };
    const strategy = new Strategy(strategyObj);
    mockPortfolio.addStrategy(strategy);
    const vector = Optimizer.getOptimizerVector(mockPortfolio);
    // length should be 4; 2 for buyAmount and 2 for sellAmount
    expect(vector.length).toBe(4);
    expect(vector[0].fieldName).toBe("buyAmount.amount");
    expect(vector[1].fieldName).toBe("buyAmount.type");
    expect(vector[2].fieldName).toBe("sellAmount.amount");
    expect(vector[3].fieldName).toBe("sellAmount.type");
  });

  test("Can get an optimizer vector of a portfolio with multiple strategies", async () => {
    const mockPortfolio = new MockPortfolio(portfolio);
    const strategyObj: IStrategy = {
      name: "NVDA Buy Low Sell High",
      userId: user.id,
      targetAsset: new Stock("NVDA"),
      buyingConditions: [],
      sellingConditions: [],
      buyAmount: new PurchaseAndSaleAllocation({
        amount: 2000,
        type: AllocationEnum.DOLLARS,
      }),
      sellAmount: new PurchaseAndSaleAllocation({
        amount: 500,
        type: AllocationEnum.DOLLARS,
      }),
    };
    const strategy = new Strategy(strategyObj);
    const strategy2 = new Strategy(strategyObj);
    mockPortfolio.addStrategy(strategy);
    mockPortfolio.addStrategy(strategy2);
    const vector = Optimizer.getOptimizerVector(mockPortfolio);
    // length should be 4; 2 for buyAmount and 2 for sellAmount
    vector[6].value = 100;
    Optimizer.setOptimizerVector(mockPortfolio, vector);
    const newVector = Optimizer.getOptimizerVector(mockPortfolio);
    expect(newVector[6].value).toBe(100);
  });

  test("Can get an optimizer vector of a portfolio with a strategy and buying conditions", async () => {
    const mockPortfolio = new MockPortfolio(portfolio);
    const strategyObj: IStrategy = {
      name: "NVDA Buy Low Sell High",
      userId: user.id,
      targetAsset: new Stock("NVDA"),
      buyingConditions: [],
      sellingConditions: [],
      buyAmount: new PurchaseAndSaleAllocation({
        amount: 2000,
        type: AllocationEnum.DOLLARS,
      }),
      sellAmount: new PurchaseAndSaleAllocation({
        amount: 500,
        type: AllocationEnum.DOLLARS,
      }),
    };
    const strategy = new Strategy(strategyObj);
    strategy.addBuyingCondition(
      HavePositionCondition.HaveNoPositions([new Stock("NVDA")])
    );
    mockPortfolio.addStrategy(strategy);
    const vector = Optimizer.getOptimizerVector(mockPortfolio);
    expect(vector.length).toBe(7);
  });

  test("Can get an optimizer vector of a portfolio with a strategy and compound buy condition", async () => {
    const mockPortfolio = new MockPortfolio(portfolio);
    const strategyObj: IStrategy = {
      name: "NVDA Buy Low Sell High",
      userId: user.id,
      targetAsset: new Stock("NVDA"),
      buyingConditions: [],
      sellingConditions: [],
      buyAmount: new PurchaseAndSaleAllocation({
        amount: 2000,
        type: AllocationEnum.DOLLARS,
      }),
      sellAmount: new PurchaseAndSaleAllocation({
        amount: 500,
        type: AllocationEnum.DOLLARS,
      }),
    };
    const strategy = new Strategy(strategyObj);
    const condition = new AndCondition({});
    condition.addAll([
      HavePositionCondition.HaveNoPositions([new Stock("NVDA")]),
      HavePositionCondition.HaveNoPositions([new Stock("COIN")]),
    ]);
    strategy.addBuyingCondition(condition);
    mockPortfolio.addStrategy(strategy);
    const vector = Optimizer.getOptimizerVector(mockPortfolio);
    expect(vector.length).toBe(10); // 4 (buyAmount and sellAmount) + 6 (conditions)
  });

  test("Can set an optimizer vector of a portfolio with strategies", async () => {
    const mockPortfolio = new MockPortfolio(portfolio);
    mockPortfolio.addStrategy(
      new Strategy({
        name: "NVDA Buy Low Sell High",
        userId: user.id,
        targetAsset: new Stock("NVDA"),
        buyingConditions: [],
        sellingConditions: [],
        buyAmount: new PurchaseAndSaleAllocation({
          amount: 2000,
          type: AllocationEnum.DOLLARS,
        }),
        sellAmount: new PurchaseAndSaleAllocation({
          amount: 500,
          type: AllocationEnum.DOLLARS,
        }),
      })
    );
    mockPortfolio.addStrategy(
      new Strategy({
        name: "NVDA Buy Low Sell High",
        userId: user.id,
        targetAsset: new Stock("NVDA"),
        buyingConditions: [],
        sellingConditions: [],
        buyAmount: new PurchaseAndSaleAllocation({
          amount: 33.3,
          type: AllocationEnum.PERCENT_OF_BUYING_POWER,
        }),
        sellAmount: new PurchaseAndSaleAllocation({
          amount: 75,
          type: AllocationEnum.PERCENT_OF_CURRENT_POSITIONS,
        }),
      })
    );
    const vector = Optimizer.getOptimizerVector(mockPortfolio);
    expect(vector.length).toBe(8);
    vector[0].value = 50;
    vector[1].value = 0;
    vector[2].value = 25;
    vector[3].value = 1;
    vector[4].value = 1;
    Optimizer.setOptimizerVector(mockPortfolio, vector);
    const newVector = Optimizer.getOptimizerVector(mockPortfolio);
    expect(newVector[0].value).toBe(50);
    expect(newVector[1].value).toBe(0);
    expect(mockPortfolio.strategies[0].buyAmount.amount).toBe(50);
    const allocationEnumValues = Object.values(AllocationEnum);
    expect(mockPortfolio.strategies[0].buyAmount.type).toBe(
      allocationEnumValues[0]
    );
    expect(mockPortfolio.strategies[1].buyAmount.amount).toBe(25);
    expect(mockPortfolio.strategies[1].buyAmount.type).toBe(
      allocationEnumValues[1]
    );
    expect(mockPortfolio.strategies[0].sellAmount.amount).toBe(1);
  });

  test("Can set an optimizer vector of a portfolio with simple condition", async () => {
    const mockPortfolio = new MockPortfolio(portfolio);
    mockPortfolio.addStrategy(
      new Strategy({
        name: "NVDA Buy Low Sell High",
        userId: user.id,
        targetAsset: new Stock("NVDA"),
        buyingConditions: [new PortfolioIsProfitableCondition()],
        sellingConditions: [],
        buyAmount: new PurchaseAndSaleAllocation({
          amount: 2000,
          type: AllocationEnum.DOLLARS,
        }),
        sellAmount: new PurchaseAndSaleAllocation({
          amount: 500,
          type: AllocationEnum.DOLLARS,
        }),
      })
    );
    const vector = Optimizer.getOptimizerVector(mockPortfolio);
    expect(vector.length).toBe(5);
    vector[4].value = 10;
    Optimizer.setOptimizerVector(mockPortfolio, vector);
    const newVector = Optimizer.getOptimizerVector(mockPortfolio);
    expect(newVector[4].value).toBe(10);
    const isProfitable = mockPortfolio.strategies[0]
      .buyingConditions[0] as PortfolioIsProfitableCondition;
    expect(isProfitable.percentProfit).toBe(10);
  });

  test("Can set an optimizer vector of a portfolio with complex condition", async () => {
    const mockPortfolio = new MockPortfolio(portfolio);
    mockPortfolio.addStrategy(
      new Strategy({
        name: "NVDA Buy Low Sell High",
        userId: user.id,
        targetAsset: new Stock("NVDA"),
        buyingConditions: [],
        sellingConditions: [MovingAveragePriceCondition.PriceIsNotTooHigh()],
        buyAmount: new PurchaseAndSaleAllocation({
          amount: 2000,
          type: AllocationEnum.DOLLARS,
        }),
        sellAmount: new PurchaseAndSaleAllocation({
          amount: 500,
          type: AllocationEnum.DOLLARS,
        }),
      })
    );
    const vector = Optimizer.getOptimizerVector(mockPortfolio);
    expect(vector.length).toBe(10);
    vector[4].value = 10; // duration.number = 10
    vector[5].value = 3.42; // standardDeviation = 0
    vector[6].value = 0; // statisticalMethod = 0
    Optimizer.setOptimizerVector(mockPortfolio, vector);
    const newVector = Optimizer.getOptimizerVector(mockPortfolio);
    expect(newVector[4].value).toBe(-10); // special case for MovingAveragePriceCondition
    expect(newVector[5].value).toBe(3.42);
    expect(newVector[6].value).toBe(0);
    const maPrice = mockPortfolio.strategies[0]
      .sellingConditions[0] as MovingAveragePriceCondition;
    expect(maPrice.duration.number).toBe(10);
    expect(maPrice.duration.unit).toBe(TimeIntervalEnum.DAY);
    expect(maPrice.standardDeviation).toBe(3.42);
    expect(maPrice.statisticalMethod).toBe(Object.values(StatisticsEnum)[0]);
  });

  test("Can set an optimizer vector of a portfolio with compound condition", async () => {
    const mockPortfolio = new MockPortfolio(portfolio);
    const andCondition = new AndCondition({});
    andCondition.addAll([
      new PortfolioIsProfitableCondition(),
      MovingAveragePriceCondition.PriceIsNotTooHigh(),
    ]);
    mockPortfolio.addStrategy(
      new Strategy({
        name: "NVDA Buy Low Sell High",
        userId: user.id,
        targetAsset: new Stock("NVDA"),
        buyingConditions: [],
        sellingConditions: [andCondition],
        buyAmount: new PurchaseAndSaleAllocation({
          amount: 2000,
          type: AllocationEnum.DOLLARS,
        }),
        sellAmount: new PurchaseAndSaleAllocation({
          amount: 500,
          type: AllocationEnum.DOLLARS,
        }),
      })
    );
    const vector = Optimizer.getOptimizerVector(mockPortfolio);
    expect(vector.length).toBe(11); // minus 1 because we exclude TimeIntervalEnum
    vector[4].value = 8.5; // sellingCondition[0].conditions[0].duration.number = 10
    Optimizer.setOptimizerVector(mockPortfolio, vector);
    const newVector = Optimizer.getOptimizerVector(mockPortfolio);
    expect(newVector[4].value).toBe(8.5);
    const andConditionResult = mockPortfolio.strategies[0]
      .sellingConditions[0] as AndCondition;
    const isProfitable = andConditionResult
      .conditions[0] as PortfolioIsProfitableCondition;
    expect(isProfitable.percentProfit).toBe(8.5);
  });

  test("Can set an optimizer vector of a portfolio with complicated compound condition", async () => {
    const mockPortfolio = new MockPortfolio(portfolio);
    const andCondition = new AndCondition({});
    andCondition.addAll([
      new PortfolioValueIsCondition({
        amount: 100,
        comparator: Comparator.GREATER_THAN,
      }),
      new ThenCondition({
        duration: new Duration(10, TimeIntervalEnum.DAY),
        conditions: [
          new BuyingPowerIsCondition({
            amount: 1000,
            comparator: Comparator.GREATER_THAN,
          }),
          new PositionPercentChangeCondition({
            targetAssets: [new Stock("QQQ")],
            percentChange: -20,
            comparator: Comparator.LESS_THAN_OR_EQUAL_TO,
          }),
        ],
      }),
    ]);
    mockPortfolio.addStrategy(
      new Strategy({
        name: "NVDA Buy Low Sell High",
        userId: user.id,
        targetAsset: new Stock("NVDA"),
        buyingConditions: [],
        sellingConditions: [andCondition],
        buyAmount: new PurchaseAndSaleAllocation({
          amount: 2000,
          type: AllocationEnum.DOLLARS,
        }),
        sellAmount: new PurchaseAndSaleAllocation({
          amount: 500,
          type: AllocationEnum.DOLLARS,
        }),
      })
    );
    const vector = Optimizer.getOptimizerVector(mockPortfolio);
    expect(vector.length).toBe(11); // 4 (strategy) + 2 (Portfolio value is) + 2 (Then) + 4 (Then conditions) - 1 because we exclude TimeIntervalEnum
    vector[10].value = 2;
    Optimizer.setOptimizerVector(mockPortfolio, vector);
    const newVector = Optimizer.getOptimizerVector(mockPortfolio);
    expect(newVector[10].value).toBe(2);
    const andConditionResult: AndCondition = mockPortfolio.strategies[0]
      .sellingConditions[0] as AndCondition;
    const thenCondition: ThenCondition = andConditionResult
      .conditions[1] as ThenCondition;
    const portfolioValueIsCondition: PortfolioValueIsCondition = thenCondition
      .conditions[1] as PortfolioValueIsCondition;
    expect(portfolioValueIsCondition.comparator).toBe(
      Object.values(Comparator)[2]
    );
  });

  test("Can run a basic GA", async () => {
    const startDate = new Date("2021-03-01");
    const endDate = new Date("2021-03-02");
    const brokerage = new TestBrokerage({
      name: BrokerageEnum.TEST,
      authDetails: null,
    });
    const marketData: MarketDataArray = [
      {
        date: "2020-02-22",
        open: 140,
        close: 142,
        high: 151,
        low: 139.8,
        volume: 20000,
      },
      {
        date: "2021-02-28",
        open: 100,
        close: 110,
        high: 111,
        low: 100,
        volume: 10000,
      },
      {
        date: "2021-03-01",
        open: 100,
        close: 110,
        high: 111,
        low: 100,
        volume: 10000,
      },
      {
        date: "2021-03-02",
        open: 110,
        close: 110,
        high: 130,
        low: 110,
        volume: 11000,
      },
      {
        date: "2021-03-05",
        open: 110,
        close: 90,
        high: 130,
        low: 80,
        volume: 12000,
      },
    ];
    brokerage.constructRealisticMarketDict(new Stock("NVDA"), marketData);
    const backtestBrokerage = new BacktestBrokerage({ brokerage });
    const mockPortfolio = new MockPortfolio(portfolio);
    const andCondition = new AndCondition({});
    andCondition.addAll([
      new PortfolioIsProfitableCondition(),
      MovingAveragePriceCondition.PriceIsNotTooHigh(),
    ]);
    mockPortfolio.addStrategy(
      new Strategy({
        name: "NVDA Buy Low Sell High",
        userId: user.id,
        targetAsset: new Stock("NVDA"),
        buyingConditions: [],
        sellingConditions: [andCondition],
        buyAmount: new PurchaseAndSaleAllocation({
          amount: 2000,
          type: AllocationEnum.DOLLARS,
        }),
        sellAmount: new PurchaseAndSaleAllocation({
          amount: 500,
          type: AllocationEnum.DOLLARS,
        }),
      })
    );
    const optimizer = new Optimizer({
      name: "Test Optimizer",
      portfolio: mockPortfolio,
      brokerage: backtestBrokerage,
      interval: TimeIntervalEnum.DAY,
      userId: user.id,
      startDate: startDate,
      endDate: endDate,
      populationSize: 5,
      numGenerations: 1,
      fitnessFunction: FitnessEnum.percentChange,
    });
    optimizer.__unsafeSpeedup();
    optimizer.verbose = false;
    await optimizer.run();
    expect(optimizer.populationSize).toBe(5);
    // one for initial population, one for each generation
    expect(optimizer.trainingFitnessHistory.length).toBe(2);
    expect(optimizer.validationFitnessHistory.length).toBe(2);
    optimizer.numGenerations = 5;
    optimizer.verbose = false;
    await optimizer.run();
    expect(optimizer.trainingFitnessHistory.length).toBe(7);
  });

  test("Can run a GA after loading it from the Db", async () => {
    const startDate = new Date("2021-03-01");
    const endDate = new Date("2021-03-02");
    const brokerage = new TestBrokerage({
      name: BrokerageEnum.TEST,
      authDetails: null,
    });
    const marketData: MarketDataArray = [
      {
        date: "2020-02-22", // this is startDate - 365 - 7
        open: 100,
        close: 110,
        high: 111,
        low: 100,
        volume: 10000,
      },
      {
        date: "2021-02-27",
        open: 100,
        close: 110,
        high: 111,
        low: 100,
        volume: 10000,
      },
      {
        date: "2021-02-28",
        open: 100,
        close: 110,
        high: 111,
        low: 100,
        volume: 10000,
      },
      {
        date: "2021-03-01",
        open: 100,
        close: 110,
        high: 111,
        low: 100,
        volume: 10000,
      },
      {
        date: "2021-03-02",
        open: 110,
        close: 110,
        high: 130,
        low: 110,
        volume: 11000,
      },
      {
        date: "2021-03-05",
        open: 110,
        close: 90,
        high: 130,
        low: 80,
        volume: 12000,
      },
    ];
    brokerage.constructRealisticMarketDict(new Stock("NVDA"), marketData);
    const backtestBrokerage = new BacktestBrokerage({ brokerage });
    const mockPortfolio = new MockPortfolio(portfolio);
    const andCondition = new AndCondition({});
    andCondition.addAll([
      new PortfolioIsProfitableCondition(),
      MovingAveragePriceCondition.PriceIsNotTooHigh(),
    ]);
    mockPortfolio.addStrategy(
      new Strategy({
        name: "NVDA Buy Low Sell High",
        userId: user.id,
        targetAsset: new Stock("NVDA"),
        buyingConditions: [],
        sellingConditions: [andCondition],
        buyAmount: new PurchaseAndSaleAllocation({
          amount: 2000,
          type: AllocationEnum.DOLLARS,
        }),
        sellAmount: new PurchaseAndSaleAllocation({
          amount: 500,
          type: AllocationEnum.DOLLARS,
        }),
      })
    );
    const optimizer = new Optimizer({
      name: "Test Optimizer",
      portfolio: mockPortfolio,
      brokerage: backtestBrokerage,
      interval: TimeIntervalEnum.DAY,
      userId: user.id,
      startDate: startDate,
      endDate: endDate,
      populationSize: 5,
      numGenerations: 1,
      fitnessFunction: FitnessEnum.percentChange,
    });
    expect(optimizer.trainingFitnessHistory.length).toBe(0);
    await optimizer.save();
    let newOptimizer = await Optimizer.findOne(
      optimizer.id,
      user.id,
      brokerage
    );
    newOptimizer.__unsafeSpeedup();
    newOptimizer.verbose = false;
    await newOptimizer.run();
    expect(newOptimizer.populationSize).toBe(5);
    // one for initial population, one for each generation
    expect(newOptimizer.trainingFitnessHistory.length).toBe(2);
    expect(newOptimizer.validationFitnessHistory.length).toBe(2);
    newOptimizer.numGenerations = 5;
    await newOptimizer.save();
    newOptimizer = await Optimizer.findOne(optimizer.id, user.id, brokerage);
    expect(newOptimizer.trainingFitnessHistory.length).toBe(2);
    newOptimizer.__unsafeSpeedup();
    newOptimizer.verbose = false;
    await newOptimizer.run();
    expect(newOptimizer.trainingFitnessHistory.length).toBe(7);
  });

  test("Test can fix allocation fields in vector", async () => {
    const mockPortfolio = new MockPortfolio(portfolio);
    const startDate = new Date("2021-03-01");
    const endDate = new Date("2021-03-02");
    const brokerage = new TestBrokerage({
      name: BrokerageEnum.TEST,
      authDetails: null,
    });
    const strategyObj: IStrategy = {
      name: "NVDA Buy Low Sell High",
      userId: user.id,
      targetAsset: new Stock("NVDA"),
      buyingConditions: [],
      sellingConditions: [],
      buyAmount: new PurchaseAndSaleAllocation({
        amount: 2000,
        type: AllocationEnum.DOLLARS,
      }),
      sellAmount: new PurchaseAndSaleAllocation({
        amount: 500,
        type: AllocationEnum.DOLLARS,
      }),
    };
    const strategy = new Strategy(strategyObj);
    strategy.addBuyingCondition(
      HavePositionCondition.HaveNoPositions([new Stock("NVDA")])
    );
    mockPortfolio.addStrategy(strategy);
    const optimizer = new Optimizer({
      name: "Test Optimizer",
      portfolio: mockPortfolio,
      brokerage: BacktestBrokerage.create(brokerage),
      interval: TimeIntervalEnum.DAY,
      userId: user.id,
      startDate: startDate,
      endDate: endDate,
      populationSize: 5,
      numGenerations: 1,
      fitnessFunction: FitnessEnum.percentChange,
    });
    const vector = Optimizer.getOptimizerVector(mockPortfolio);
    expect(vector.length).toBe(7);
    vector[1].value = vector[1].values.findIndex(
      (v) => v === AllocationEnum.PERCENT_OF_BUYING_POWER
    );
    vector[0].value = 10000;
    optimizer.fixStateElement(vector);
    expect(vector[0].value).toBe(100);
    expect(vector[0].max).toBe(100);
    expect(vector[1].value).toBe(
      vector[1].values.findIndex(
        (v) => v === AllocationEnum.PERCENT_OF_BUYING_POWER
      )
    );
  });

  test("Test can fix allocation fields in vector for multiple stratgies", async () => {
    const mockPortfolio = new MockPortfolio(portfolio);
    const startDate = new Date("2021-03-01");
    const endDate = new Date("2021-03-02");
    const brokerage = new TestBrokerage({
      name: BrokerageEnum.TEST,
      authDetails: null,
    });
    const strategyObj: IStrategy = {
      name: "NVDA Buy Low Sell High",
      userId: user.id,
      targetAsset: new Stock("NVDA"),
      buyingConditions: [],
      sellingConditions: [],
      buyAmount: new PurchaseAndSaleAllocation({
        amount: 2000,
        type: AllocationEnum.DOLLARS,
      }),
      sellAmount: new PurchaseAndSaleAllocation({
        amount: 500,
        type: AllocationEnum.DOLLARS,
      }),
    };
    const strategy = new Strategy(strategyObj);
    strategy.addBuyingCondition(
      HavePositionCondition.HaveNoPositions([new Stock("NVDA")])
    );
    mockPortfolio.addStrategy(strategy);
    const strategyObj2: IStrategy = {
      name: "NVDA Buy Low Sell High",
      userId: user.id,
      targetAsset: new Stock("NVDA"),
      buyingConditions: [],
      sellingConditions: [],
      buyAmount: new PurchaseAndSaleAllocation({
        amount: 2000,
        type: AllocationEnum.DOLLARS,
      }),
      sellAmount: new PurchaseAndSaleAllocation({
        amount: 500,
        type: AllocationEnum.DOLLARS,
      }),
    };
    const strategy2 = new Strategy(strategyObj);
    strategy2.addBuyingCondition(
      HavePositionCondition.HaveNoPositions([new Stock("NVDA")])
    );
    mockPortfolio.addStrategy(strategy2);
    const optimizer = new Optimizer({
      name: "Test Optimizer",
      portfolio: mockPortfolio,
      brokerage: BacktestBrokerage.create(brokerage),
      interval: TimeIntervalEnum.DAY,
      userId: user.id,
      startDate: startDate,
      endDate: endDate,
      populationSize: 5,
      numGenerations: 1,
      fitnessFunction: FitnessEnum.percentChange,
    });
    const vector = Optimizer.getOptimizerVector(mockPortfolio);
    vector[1].value = vector[1].values.findIndex(
      (v) => v === AllocationEnum.PERCENT_OF_PORTFOLIO
    );
    vector[0].value = 10000;
    optimizer.fixStateElement(vector);
    expect(vector[0].value).toBe(100);
    expect(vector[0].max).toBe(100);
    expect(vector[1].value).toBe(
      vector[1].values.findIndex(
        (v) => v === AllocationEnum.PERCENT_OF_PORTFOLIO
      )
    );
    expect(vector.length).toBe(14);
    vector[3].value = vector[1].values.findIndex(
      (v) => v === AllocationEnum.PERCENT_OF_BUYING_POWER
    );
    vector[2].value = 10000;
    optimizer.fixStateElement(vector);
    expect(vector[2].value).toBe(100);
    expect(vector[2].max).toBe(100);
    expect(vector[3].value).toBe(
      vector[3].values.findIndex(
        (v) => v === AllocationEnum.PERCENT_OF_BUYING_POWER
      )
    );
  });
});
