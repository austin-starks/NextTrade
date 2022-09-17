import AssetFactory from "../models/asset";
import ConditionFactory, {
  AbstractCondition,
  AndCondition,
} from "../models/conditions";
import { IConditionError } from "../models/conditions/abstract";
import FormControl from "../models/field/formControl";
import { debug, FormValidationError, Request, Response } from "../utils";

const catchConditionError = (
  e: Error,
  conditionError: IConditionError,
  callback: (condition: AbstractCondition) => void
) => {
  if (e instanceof FormValidationError) {
    conditionError.error = true;
    callback(e.object as any);
  } else {
    throw e;
  }
};

class ConditionController {
  getConditions = async (req: Request, res: Response) => {
    try {
      const conditions = await ConditionFactory.getConditionOptions();
      res.status(200).json({
        conditions,
      });
    } catch (e) {
      debug(e);
      res.status(500).json({ message: e.message });
    }
  };

  validateAndCreateCompound = async (req: Request, res: Response) => {
    const conditionObj: Readonly<AndCondition> = req.body;
    const conditionError: IConditionError = { error: false, conditions: [] };
    try {
      FormControl.validateFields(conditionObj.form);
    } catch (e) {
      catchConditionError(e, conditionError, (c) => {
        conditionError.form = c.form;
      });
    }
    for (let i = 0; i < conditionObj.conditions.length; i++) {
      const condition = conditionObj.conditions[i];
      try {
        FormControl.validateFields(condition.form);
        conditionError.conditions.push(condition);
      } catch (e) {
        catchConditionError(e, conditionError, (c) => {
          conditionError.conditions.push({ ...condition, ...c, form: c.form });
        });
      }
    }
    try {
      if (conditionError.error) {
        delete conditionError.error;
        res
          .status(400)
          .json({ conditionError: { ...req.body, ...conditionError } });
        return;
      }
      const condition = ConditionFactory.createFromForm({
        ...conditionObj,
      }) as AndCondition;
      condition.conditions = req.body.conditions.map((c: AbstractCondition) => {
        return ConditionFactory.createFromForm({
          ...c,
          form: c.form,
        });
      });
      for (const c of condition.conditions) {
        const assetFields = c.assetFields;
        for (const field of assetFields) {
          await AssetFactory.validate(field.value);
        }
      }
      condition.generateId();
      res.status(200).json({ condition });
    } catch (e) {
      debug(e);
      if (e instanceof FormValidationError) {
        res.status(400).json({ message: e.message, form: e.object.form });
      } else {
        res.status(400).json({ message: e.message });
      }
    }
  };

  validateAndCreate = async (req: Request, res: Response) => {
    try {
      FormControl.validateFields(req.body.form);
      const condition = ConditionFactory.createFromForm({
        _id: req.body._id,
        type: req.body.type,
        form: req.body.form,
      });
      const assetFields = condition.assetFields;
      for (const field of assetFields) {
        await AssetFactory.validate(field.value);
      }
      condition.generateId();
      res.status(200).json({ condition });
    } catch (e) {
      debug("Error: ", e.message);
      if (e instanceof FormValidationError) {
        res.status(400).json({ message: e.message, form: e.object.form });
      } else {
        res.status(400).json({ message: e.message });
      }
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const conditionId = req.params.conditionId;
      const condition = await AbstractCondition.findById(
        conditionId as any,
        req.user.id
      );
      if (!condition) {
        throw new Error(`Condition not found`);
      }
      await condition.delete(req.user.id);
      const conditions = await ConditionFactory.getFromUser(req.user.id);
      res.status(200).json({ message: "Condition deleted", conditions });
    } catch (e) {
      debug("Error", e);
      res.status(500).json({ message: e.message });
    }
  };
}
export default new ConditionController();
