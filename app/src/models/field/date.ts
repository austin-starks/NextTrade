import { FieldEnum } from "../../utils/enums";
import AbstractField, { IFieldOptions } from "./abstract";

class DateField extends AbstractField {
  public fieldType: FieldEnum;
  public value: string;
  constructor(options: IFieldOptions) {
    super(options);
    this.fieldType = FieldEnum.DATE;
    this.value = options?.value?.toString();
  }
}

export default DateField;
