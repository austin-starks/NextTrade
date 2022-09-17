import { FilterQuery } from "mongoose";
import { print } from "../../utils";
import { ConditionEnum } from "../../utils/enums";
import { Id } from "../abstractions/abstractModel";
import FormControl from "../field/formControl";
import AbstractCondition, {
  ConditionModel,
  ICondition,
  IConditionDocument,
} from "./abstract";
import AndCondition from "./and";
import PositionIsShortCondition from "./assetIsShort";
import BuyingPowerIsCondition from "./buyingPowerIs";
import EnoughTimePassedCondition from "./enoughTimePassed";
import HavePositionCondition from "./havePosition";
import MovingAveragePriceCondition from "./movingAverage";
import OrCondition from "./or";
import PortfolioIsProfitableCondition from "./portfolioIsProfitable";
import PortfolioValueIsCondition from "./portfolioValueIs";
import PositionPercentChangeCondition from "./positionPercentChange";
import PositionValueIsCondition from "./positionValueIs";
import SimplePriceCondition from "./simplePrice";
import ThenCondition from "./then";

const exclusionList = [
  ConditionEnum.AbstractCondition,
  ConditionEnum.PositionIsShort,
];

class ConditionFactory {
  public static async getFromUser(
    userId: Id,
    query: FilterQuery<IConditionDocument> = {}
  ) {
    return ConditionModel.find({
      userId: userId,
      ...query,
    }).then((models) =>
      models.map((model) => {
        const condition = ConditionFactory.create(model.data);
        condition._id = model._id.toString();
        return condition;
      })
    );
  }

  public static createFromArray(array: ICondition[]) {
    return array.map((condition) => {
      const newCondition = ConditionFactory.create(condition);
      return newCondition;
    });
  }

  static async nameExists(name: string, userId: Id) {
    const conditionModel = await ConditionModel.findOne({
      userId,
      "data.name": name,
    });
    return !!conditionModel;
  }

  public static async getConditionOptions(): Promise<AbstractCondition[]> {
    const conditionTypes = await ConditionModel.find({
      userId: null,
    }).then((models) =>
      models.map((model: any) => {
        model.data._id = null;
        model.data.version = 0;
        model.data.form = ConditionFactory.create(model.data).getForm();
        return model.data;
      })
    );
    return conditionTypes;
  }
  public static async initializeConditionsInDb(forceUpdate = false) {
    let earlyReturn = forceUpdate ? false : await ConditionModel.exists({});
    if (earlyReturn) {
      return;
    }
    print("Initializing Conditions");
    const conditionNames = Object.values(ConditionEnum).filter(
      (condition) => !exclusionList.includes(condition)
    );
    const conpoundConditions = [
      ConditionEnum.AndCondition,
      ConditionEnum.ThenCondition,
      ConditionEnum.OrCondition,
    ];
    const nonCompoundConditions = conditionNames.filter(
      (c) => !conpoundConditions.includes(c)
    );
    let promises = [];
    await ConditionModel.deleteMany({ userId: null });
    for (let i = 0; i < conpoundConditions.length; i++) {
      let type = conpoundConditions[i];
      let condition = ConditionFactory.create({ type } as any);
      delete condition._id;
      let promise = condition.save(null);
      promises.push(promise);
    }
    await Promise.all(promises);
    promises = [];
    for (let i = 0; i < nonCompoundConditions.length; i++) {
      let type = nonCompoundConditions[i];
      let condition = ConditionFactory.create({ type } as any);
      delete condition._id;
      let promise = condition.save(null);
      promises.push(promise);
    }
    await Promise.all(promises);
    print("Initializing Conditions Complete");
  }

  /**
   * Updates the condition with the attributes in its form fields
   * */
  public static createFromForm(conditionObj: {
    type: ConditionEnum;
    form: FormControl;
    _id?: Id;
  }): AbstractCondition {
    const { _id, form } = conditionObj;
    FormControl.set(conditionObj, form);
    const condition = ConditionFactory.create(conditionObj as any);
    condition._id = _id;
    condition.form = form;
    return condition;
  }

  public static create(obj: ICondition): AbstractCondition {
    let condition: AbstractCondition;
    switch (obj.type) {
      case ConditionEnum.PortfolioValueIs:
        condition = new PortfolioValueIsCondition(
          obj as PortfolioValueIsCondition
        );
        break;
      case ConditionEnum.BuyingPowerIs:
        condition = new BuyingPowerIsCondition(obj as BuyingPowerIsCondition);
        break;
      case ConditionEnum.PositionValueIs:
        condition = new PositionValueIsCondition(
          obj as PositionValueIsCondition
        );
        break;
      case ConditionEnum.PositionIsShort:
        condition = new PositionIsShortCondition();
        break;
      case ConditionEnum.SimplePriceCondition:
        condition = new SimplePriceCondition(obj as SimplePriceCondition);
        break;
      case ConditionEnum.HavePosition:
        condition = new HavePositionCondition(obj as HavePositionCondition);
        break;
      case ConditionEnum.EnoughTimePassed:
        condition = new EnoughTimePassedCondition(
          obj as EnoughTimePassedCondition
        );
        break;
      case ConditionEnum.PortfolioIsProfitable:
        condition = new PortfolioIsProfitableCondition(
          obj as PortfolioIsProfitableCondition
        );
        break;
      case ConditionEnum.MovingAveragePriceCondition:
        condition = new MovingAveragePriceCondition(
          obj as MovingAveragePriceCondition
        );
        break;
      case ConditionEnum.PositionPercentChangeCondition:
        condition = new PositionPercentChangeCondition(
          obj as PositionPercentChangeCondition
        );
        break;
      case ConditionEnum.OrCondition:
        condition = new OrCondition(obj as OrCondition);
        break;
      case ConditionEnum.AndCondition:
        condition = new AndCondition(obj as AndCondition);
        break;
      case ConditionEnum.ThenCondition:
        condition = new ThenCondition(obj as ThenCondition);
        break;
      default:
        throw new Error("Condition Not Found");
    }
    condition.form = condition.getForm();
    return condition;
  }
}

export {
  ConditionFactory,
  AbstractCondition,
  SimplePriceCondition,
  MovingAveragePriceCondition,
  EnoughTimePassedCondition,
  PortfolioIsProfitableCondition,
  PositionIsShortCondition,
  AndCondition,
  PositionPercentChangeCondition,
  HavePositionCondition,
};
export default ConditionFactory;
