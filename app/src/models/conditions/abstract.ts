import _ from "lodash";
import { model, Schema, Types } from "mongoose";
import ConditionFactory from ".";
import { uniqId } from "../../utils";
import { AssetTypeEnum, ConditionEnum } from "../../utils/enums";
import { Id } from "../abstractions/abstractModel";
import { AbstractAsset, NullAsset } from "../asset";
import { AbstractBrokerage } from "../brokerage";
import FormControl from "../field/formControl";
import FormGroup from "../field/formGroup";
import TextField from "../field/text";
import AbstractPortfolio from "../portfolio/abstractPortfolio";
import Position from "../position";
import PriceMap from "../priceMap";
import Strategy from "../strategy";
import { Duration } from "../time";

const conditionSchema = new Schema({
  data: { type: Object, required: true },
  userId: { type: Types.ObjectId, ref: "User" },
});

export interface IConditionError {
  form?: FormControl;
  conditions?: { form: FormControl }[];
  error: boolean;
}

export interface IConditionDocument extends Document {
  data: ICondition;
  userId: Id;
}

export const ConditionModel = model<IConditionDocument>(
  "Condition",
  conditionSchema
);

export interface IsConditionTrue {
  strategy: Strategy;
  brokerage: AbstractBrokerage;
  priceMap: PriceMap;
  portfolio: AbstractPortfolio;
  position?: Position;
  currentTime: Date;
}

export interface ICondition {
  type?: ConditionEnum;
  form?: FormControl;
  name?: string;
  _id?: Id;
  wasTrue?: boolean;
  version?: number;
  conditions?: ICondition[];
}

export default abstract class AbstractCondition implements ICondition {
  abstract type: ConditionEnum;
  public name: string;
  public _id?: Id;
  abstract description: string;
  abstract example: string;
  public wasTrue: boolean;
  public version: number;
  public form: FormControl;
  public duration?: Duration;
  public conditions?: AbstractCondition[];

  constructor(obj: ICondition) {
    this.name = obj.name || "";
    this._id = obj._id;
    this.wasTrue = obj.wasTrue || false;
    this.version = obj.version || 1;
    this.form = obj.form;
  }

  abstract isTrue(args: IsConditionTrue): Promise<boolean>;

  get assetFields(): {
    field: FormGroup;
    value: AbstractAsset | AbstractAsset[];
  }[] {
    const fields = this.getForm().fields;
    const result = [];
    for (const field of fields) {
      let assetField = field.getAssetField();
      if (assetField) {
        result.push({
          field: field,
          value: assetField,
        });
      }
    }
    return result;
  }

  public toString() {
    return `Condition: ${this.type}`;
  }

  public getForm(): FormControl {
    const formControl = new FormControl();
    formControl.addGroup(
      new FormGroup([
        new TextField({
          name: "name",
          label: "Name",
          helperText: "Unique name identifying this condition",
          value: this.name,
          required: false,
        }),
      ])
    );
    return formControl;
  }

  public toObject(): ICondition {
    const clone = _.cloneDeep(this);
    delete clone.description;
    delete clone.example;
    return clone;
  }

  public static async findById(id: Id, userId: Id) {
    return ConditionModel.findOne({ _id: id, userId: userId }).then((model) => {
      if (model) {
        return ConditionFactory.create(model.data);
      }
      return null;
    });
  }

  public static async findModelById(id: Id, userId: Id) {
    return ConditionModel.findOne({ _id: id, userId: userId });
  }

  public static async findModelByIds(ids: Id[], userId: Id) {
    return ConditionModel.find({ _id: { $in: ids }, userId: userId });
  }

  public async save(userId: Id) {
    let model: any;
    if (this._id) {
      model = await AbstractCondition.findModelById(this._id, userId);
      model.data = this;
    }
    if (!model) {
      model = await ConditionModel.create({
        data: this,
        userId: userId,
      });
      this._id = model._id;
      model.data._id = this._id;
      await model.save();
    }
    model.data.version += 1;
    model.markModified("data");
    this.version = model.data.version;
    await model.save();
    return this;
  }

  public async delete(userId: Id) {
    return ConditionModel.deleteOne({ _id: this._id, userId: userId });
  }

  public hasAssetField() {
    if (_.isNil(this.assetFields)) {
      return false;
    }
    if (this.assetFields.length === 0) {
      return false;
    }
    const everyValueIsNull = this.assetFields.every((assetField) => {
      if (_.isArray(assetField.value)) {
        return assetField.value.length === 0;
      }
      if (_.isNil(assetField)) {
        return true;
      }
      if (
        assetField.value instanceof NullAsset ||
        assetField.value.type === AssetTypeEnum.NONE
      ) {
        return true;
      }
    });
    return !everyValueIsNull;
  }
  public generateId() {
    if (!this._id) {
      this._id = uniqId();
    }
  }
}
