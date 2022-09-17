import _ from "lodash";
import { FieldEnum, FormValidationError } from "../../utils";
import AbstractField from "./abstract";
import FormGroup from "./formGroup";
import NumberField from "./number";
import SelectField from "./select";

interface ObjectWithForm {
  form: FormControl;
}

class FormControl {
  public fields: FormGroup[];
  constructor(fields?: FormGroup[]) {
    this.fields = fields || [];
  }
  public addGroup(group: FormGroup) {
    this.fields.push(group);
  }

  public clear() {
    this.fields = [];
  }

  public removeField(name: string): FormControl {
    for (let i = 0; i < this.fields.length; i++) {
      const group = this.fields[i];
      for (const field of group.fields) {
        if (field.name === name) {
          this.fields.splice(i, 1);
        }
      }
    }
    return this;
  }

  public getField(name: string): AbstractField {
    for (let i = 0; i < this.fields.length; i++) {
      const group = this.fields[i];
      for (const field of group.fields) {
        if (field.name.startsWith(name)) {
          return field;
        }
      }
    }
    return null;
  }

  public static create<T extends ObjectWithForm>(
    form: FormControl,
    object: T
  ): T {
    const obj = _.cloneDeep(object);
    const counts = new Map<string, number>();
    for (let i = 0; i < form.fields.length; i++) {
      let group = form.fields[i];
      for (let j = 0; j < group.fields.length; j++) {
        let field = group.fields[j];
        if (group.multiple) {
          let splitName = field.name.split(".");
          let firstWord = splitName.shift();
          let count = 0;
          if (counts.has(field.name)) {
            count = counts.get(field.name) + 1;
          }
          let name = `${firstWord}[${count}].${splitName.join(".")}`;
          counts.set(field.name, count);
          _.set(obj, name, field.value);
        } else {
          _.set(obj, field.name, field.value);
        }
      }
    }
    obj.form = form;
    return obj;
  }

  public static set<T extends object>(obj: T, form: FormControl): T {
    const counts = new Map<string, number>();
    for (let i = 0; i < form.fields.length; i++) {
      let group = form.fields[i];
      for (let j = 0; j < group.fields.length; j++) {
        let field = group.fields[j];
        if (group.multiple) {
          let splitName = field.name.split(".");
          let firstWord = splitName.shift();
          let count = 0;
          if (counts.has(field.name)) {
            count = counts.get(field.name) + 1;
          }
          let name = `${firstWord}[${count}].${splitName.join(".")}`;
          counts.set(field.name, count);
          _.set(obj, name, field.value);
        } else {
          _.set(obj, field.name, field.value);
        }
      }
    }
    return obj;
  }

  static validateFields(control: FormControl) {
    if (!control) {
      throw new FormValidationError("Form was not sent in request", {
        form: control,
      });
    }
    let error = false;
    for (let i = 0; i < control.fields.length; i++) {
      let group = control.fields[i];
      for (let j = 0; j < group.fields.length; j++) {
        let field = group.fields[j];
        if (field.required && (_.isNil(field.value) || field.value === "")) {
          field.error = `${field.label} is required`;
          error = true;
        }
        if (field.fieldType === FieldEnum.SELECT) {
          const selectField: SelectField = field as SelectField;
          if (!selectField.values.includes(selectField.value)) {
            field.error = `${field.label} contains an invalid value`;
            error = true;
          }
        }
        if (field.fieldType === FieldEnum.NUMBER) {
          const numberField = field as NumberField;
          if (
            numberField.value < numberField.min ||
            numberField.value > numberField.max
          ) {
            field.error = `${field.label} must be between ${numberField.min} and ${numberField.max}`;
            error = true;
          }
        }
      }
    }
    if (error) {
      throw new FormValidationError("Validation Error", {
        form: control,
      });
    }
  }
}

export default FormControl;
