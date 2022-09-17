import FormControl from "../models/field/formControl";

export * from "./enums";
export * from "./functions";
export * from "./interfaces";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
export class FormValidationError extends Error {
  public object: { form: FormControl };
  constructor(message: string, obj: { form: FormControl }) {
    super(message);
    this.name = "FormValidationError";
    this.object = obj;
  }
}

export function uniqId() {
  var timestamp = ((new Date().getTime() / 1000) | 0).toString(16);
  return (
    timestamp +
    "xxxxxxxxxxxxxxxx"
      .replace(/[x]/g, function () {
        return ((Math.random() * 16) | 0).toString(16);
      })
      .toLowerCase()
  );
}
