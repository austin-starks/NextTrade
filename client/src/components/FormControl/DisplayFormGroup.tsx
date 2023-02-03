import { MenuItem } from "@material-ui/core";
import InputAdornment from "@material-ui/core/InputAdornment";
import TextField from "@material-ui/core/TextField";
import { Delete } from "@material-ui/icons";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { DesktopDatePicker } from "@mui/lab";
import { Box, SxProps, Theme } from "@mui/material/";
import date from "date-and-time";
import _ from "lodash";
import React from "react";
import { toggleHelperText } from "../../pages/Condition/helpers";
import { IFormControl } from "../../services/outsideInterfaces";
import { hoverProps } from "../../styles";
import { lightgrey } from "../../utils";
import Button from "../Button";

interface BaseObjectFormGroupProps {
  object: { form: IFormControl };
  onChange: (object: { form: IFormControl }) => void;
  onDelete?: (object: { form: IFormControl }) => void;
  onUpdate: (object: { form: IFormControl }) => Promise<void>;
  showCreateButton: boolean;
  submitButtonText: string;
  hideMultipleButtons?: boolean;
  sx?: SxProps<Theme>;
}

const getValue = (value: string | number, fieldType: string) => {
  return _.isNil(value) || value === ""
    ? ""
    : fieldType !== "number"
    ? value
    : Number(value);
};

const BaseObjectFormGroups = (props: BaseObjectFormGroupProps) => {
  const { object, hideMultipleButtons } = props;
  const formControl = object.form;
  const [helperTextRowsShown, setHelperTextRowsShown] = React.useState<
    number[]
  >([]);
  const maxDate = date.addHours(new Date(), 1);
  const [disableButton, setDisableButton] = React.useState(false);
  return (
    <Box sx={props.sx}>
      {formControl.fields.map((formGroup, row) => {
        return (
          <Box
            textAlign="start"
            mt={0}
            display={"flex"}
            justifyContent="space-between"
            alignItems="center"
            key={row}
          >
            {formGroup.fields.map((field, col) => {
              const onChange = (value?: string | number | Date | null) => {
                const newObject = _.cloneDeep(object);
                newObject.form.fields[row].fields[col].value = value as any;
                newObject.form.fields[row].fields[col].error = "";
                props.onChange(newObject);
              };
              const error = Boolean(field.error);
              const helperText = error
                ? field.error
                : helperTextRowsShown.includes(row)
                ? field.helperText
                : "";
              if (field.fieldType === "date") {
                return (
                  <DesktopDatePicker
                    disableHighlightToday={true}
                    minDate={new Date("01-01-2010")}
                    maxDate={maxDate}
                    OpenPickerButtonProps={{
                      sx: { color: lightgrey, marginRight: "2px" },
                    }}
                    key={row + "-" + col}
                    label={field.label}
                    inputFormat="MM/dd/yyyy"
                    value={_.isNil(field.value) ? "" : field.value}
                    onChange={(newValue: Date) => onChange(newValue)}
                    renderInput={(params: any) => (
                      <TextField
                        {...params}
                        error={error}
                        margin="dense"
                        helperText={helperText}
                        fullWidth
                        InputProps={{
                          endAdornment: (
                            <Box px={0} py={1} mr={1}>
                              {params.InputProps.endAdornment}
                              <Box sx={hoverProps}>
                                <InputAdornment
                                  onClick={() =>
                                    toggleHelperText(
                                      row,
                                      helperTextRowsShown,
                                      setHelperTextRowsShown
                                    )
                                  }
                                  position="start"
                                >
                                  ?
                                </InputAdornment>
                              </Box>
                            </Box>
                          ),
                        }}
                      />
                    )}
                  />
                );
              }
              return (
                <TextField
                  fullWidth
                  autoComplete="off"
                  key={row + "-" + col}
                  id={field.label + "-" + row}
                  name={field.name}
                  margin="dense"
                  label={field.label}
                  value={getValue(field.value, field.fieldType)}
                  onChange={(e) =>
                    onChange(getValue(e.target.value, field.fieldType))
                  }
                  type={field.fieldType !== "number" ? "text" : "number"}
                  select={field.fieldType === "select"}
                  error={error}
                  helperText={helperText}
                  InputProps={{
                    endAdornment: (
                      <Box px={1} py={1} mr={1} sx={hoverProps}>
                        <InputAdornment
                          onClick={() =>
                            toggleHelperText(
                              row,
                              helperTextRowsShown,
                              setHelperTextRowsShown
                            )
                          }
                          position="start"
                        >
                          ?
                        </InputAdornment>
                      </Box>
                    ),
                  }}
                >
                  {field.fieldType === "select"
                    ? field.values!.map((v) => (
                        <MenuItem value={v} key={v}>
                          {v}
                        </MenuItem>
                      ))
                    : undefined}
                </TextField>
              );
            })}
            {!hideMultipleButtons && formGroup.multiple && (
              <Box sx={{ ...hoverProps, marginTop: "12px" }} display="flex">
                {formGroup.deletable && (
                  <RemoveIcon
                    onClick={() => {
                      const newObject = _.cloneDeep(object);
                      newObject.form.fields.splice(row, 1);
                      setHelperTextRowsShown(
                        helperTextRowsShown
                          .filter((n) => n !== row)
                          .map((n) => (n > row ? n - 1 : n))
                      );
                      props.onChange(newObject);
                    }}
                  />
                )}
                <AddIcon
                  onClick={() => {
                    const newObject = _.cloneDeep(object);
                    const group = _.cloneDeep(newObject.form.fields[row]);
                    for (let i = 0; i < group.fields.length; i++) {
                      group.fields[i].value = "";
                    }
                    group.deletable = true;
                    newObject.form.fields.splice(row + 1, 0, group);
                    props.onChange(newObject);
                  }}
                />
              </Box>
            )}
          </Box>
        );
      })}
      {props.onDelete && (
        <Box mt={2} sx={hoverProps} display="flex" justifyContent={"end"}>
          <Delete
            onClick={() => {
              if (!props.onDelete) return;
              props.onDelete(object);
            }}
          />
        </Box>
      )}
      {props.showCreateButton && (
        <Box mt={2} display="flex" justifyContent="space-evenly">
          <Button
            disabled={disableButton}
            style={{ width: "80px" }}
            onClick={async () => {
              setDisableButton(true);
              await props.onUpdate(object);
              setDisableButton(false);
            }}
            variant="contained"
          >
            {props.submitButtonText}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default BaseObjectFormGroups;
