import { FieldEnum } from "../../utils/enums";
import AbstractField, { IFieldOptions } from "./abstract";

class TextField extends AbstractField {
  public fieldType: FieldEnum;
  public value: string;
  constructor(options: IFieldOptions) {
    super(options);
    this.fieldType = FieldEnum.TEXT;
    this.value = options?.value?.toString();
  }
}

export default TextField;
