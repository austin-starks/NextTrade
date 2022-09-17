import _ from "lodash";
import { FieldEnum } from "../../utils/enums";
import AbstractField, { IFieldOptions } from "./abstract";

class NumberField extends AbstractField {
  public fieldType: FieldEnum;
  public value: number | "";
  public max: number;
  public min: number;
  constructor(options: IFieldOptions, min: number, max: number) {
    super(options);
    this.fieldType = FieldEnum.NUMBER;
    this.value = !_.isNil(options.value) ? Number(options.value) : "";
    this.min = min;
    this.max = max;
  }
}

export default NumberField;
