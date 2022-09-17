import { FieldEnum } from "../../utils/enums";
import AbstractField, { IFieldOptions } from "./abstract";

class SelectField extends AbstractField {
  public fieldType: FieldEnum;
  public values: string[];
  public value: string;
  constructor(values: string[], options: IFieldOptions) {
    super(options);
    this.fieldType = FieldEnum.SELECT;
    this.values = values.filter(
      (value) => !AbstractField.exclusionList.includes(value as any)
    );
    this.value = options.value ? options.value.toString() : "";
  }
}

export default SelectField;
