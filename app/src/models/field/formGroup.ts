import { AllocationEnum, AssetTypeEnum, TimeIntervalEnum } from "../../utils";
import { Allocation } from "../allocation";
import { AbstractAsset } from "../asset";
import { Duration } from "../time";
import AbstractField from "./abstract";
import NumberField from "./number";
import SelectField from "./select";
import TextField from "./text";

class FormGroup {
  private targetAssetField: AbstractAsset | AbstractAsset[] = null;
  public fields: AbstractField[];
  public multiple: boolean;
  constructor(fields?: AbstractField[], multiple: boolean = false) {
    this.fields = fields || [];
    this.multiple = multiple;
  }
  public getAssetField() {
    return this.targetAssetField;
  }
  public addField(field: AbstractField) {
    this.fields.push(field);
  }
  public addFields(fields: AbstractField[]) {
    fields.forEach((field) => {
      this.addField(field);
    });
  }
  static allocation(fieldName: string, value: Allocation): FormGroup {
    const group = new FormGroup();
    group.addField(
      new NumberField(
        {
          label: "Allocation Amount",
          name: `${fieldName}.amount`,
          value: value?.amount,
          helperText:
            "The quantity of the assets (20 dollars, 30 shares, etc.)",
        },
        0,
        10000
      )
    );
    group.addField(
      new SelectField(Object.values(AllocationEnum), {
        label: "Allocation Type",
        name: `${fieldName}.type`,
        helperText:
          "The type of the assets (dollars, shares, percent of portfolio, etc",
        value: value?.type,
      })
    );
    return group;
  }

  static duration(duration: Duration, min: number, max: number): FormGroup {
    const group = new FormGroup();
    group.addField(
      new NumberField(
        {
          label: "Time Length",
          name: "duration.number",
          helperText: "Length of time",
          value: duration?.number,
        },
        min,
        max
      )
    );
    group.addField(
      new SelectField(Object.values(TimeIntervalEnum), {
        label: "Time Unit",
        name: "duration.unit",
        helperText: "Unit of time (hour, day, etc.)",
        value: duration?.unit,
      })
    );
    return group;
  }

  static targetAsset(
    targetAsset: AbstractAsset,
    options?: { required: boolean }
  ): FormGroup {
    const group = new FormGroup();
    group.addField(
      new TextField({
        label: "Asset Name",
        name: "targetAsset.name",
        helperText: "Ticker name (ex. SPY, BTC)",
        value: targetAsset ? targetAsset.name : "",
        required: options?.required ?? false,
      })
    );
    group.addField(
      new SelectField(Object.values(AssetTypeEnum), {
        label: "Asset Type",
        name: "targetAsset.type",
        helperText: "Ticker type (ex. Stock, Crypto)",
        value: targetAsset ? targetAsset.type : "",
        required: options?.required ?? false,
      })
    );
    group.targetAssetField = targetAsset;
    return group;
  }

  static targetAssets(
    targetAssets: AbstractAsset[],
    options?: { required: boolean }
  ): FormGroup {
    const multiple = true;
    const group = new FormGroup([], multiple);
    const appendTargetAsset = (targetAsset: AbstractAsset) => {
      group.addField(
        new TextField({
          ...options,
          label: "Asset Name",
          name: "targetAssets.name",
          helperText: "Ticker name (ex. SPY, BTC)",
          value: targetAsset ? targetAsset.name : "",
        })
      );
      group.addField(
        new SelectField(Object.values(AssetTypeEnum), {
          ...options,
          label: "Asset Type",
          name: "targetAssets.type",
          helperText: "Ticker type (ex. Stock, Crypto)",
          value: targetAsset ? targetAsset.type : "",
        })
      );
    };
    if (targetAssets && targetAssets.length > 0) {
      targetAssets.forEach(appendTargetAsset);
      group.targetAssetField = targetAssets;
    } else {
      appendTargetAsset(null);
    }
    return group;
  }
}

export default FormGroup;
