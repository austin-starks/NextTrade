import _ from "lodash";
import { AssetTypeEnum, FieldEnum } from "../../utils";

export interface IFieldOptions {
  label: string;
  name: string;
  helperText?: string;
  required?: boolean;
  value?: string | number | Date;
}

abstract class AbstractField implements IFieldOptions {
  protected static exclusionList = [AssetTypeEnum.DEBIT_SPREAD];
  abstract fieldType: FieldEnum;
  abstract value: string | number;
  helperText: string;
  tooltip: string;
  name: string;
  label: string;
  required: boolean;
  error?: string;
  constructor(options?: IFieldOptions) {
    this.helperText = options?.helperText;
    this.name = options?.name;
    this.label = options?.label;
    this.required = _.isNil(options.required) ? true : options.required;
  }
}

export default AbstractField;
