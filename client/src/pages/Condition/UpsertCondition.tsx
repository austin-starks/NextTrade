import { Typography } from "@material-ui/core";
import TextField from "@material-ui/core/TextField";
import { Autocomplete, Box } from "@mui/material/";
import _ from "lodash";
import React from "react";
import Divider from "../../components/Divider";
import DisplayFormGroup from "../../components/FormControl/DisplayFormGroup";
import { hoverProps } from "../../styles";
import { emptyCondition, toggleHelperText } from "./helpers";
import { AbstractCondition } from "./interface";

interface UpsertConditionProps {
  action: "create" | "update";
  condition: AbstractCondition;
  setCondition: (condition: AbstractCondition) => void;
  conditions: AbstractCondition[];
  onUpdateBaseCondition: (condition: AbstractCondition) => void;
  onDelete: (condition: AbstractCondition) => void;
  title?: string;
  showCreateButton?: boolean;
  disableDescription?: boolean;
  haveOnlyCompoundOptions?: boolean;
  hideMultipleButtons?: boolean;
}

interface DescriptionButtonProps {
  title: string;
  subtitle?: string;
  condition: AbstractCondition;
  helperTextRowsShown: number[];
  setHelperTextRowShown: (rows: number[]) => void;
}

export const DescriptionButton = (props: DescriptionButtonProps) => {
  const { title, subtitle, condition } = props;
  const [helperTextRowsShown, setHelperTextRowShown] = React.useState<number[]>(
    []
  );
  return (
    <Box>
      <Box sx={hoverProps} display="flex" justifyContent={"end"}>
        <Typography
          onClick={() =>
            toggleHelperText(-1, helperTextRowsShown, setHelperTextRowShown)
          }
        >
          ?
        </Typography>
      </Box>
      {title && (
        <Box>
          <Typography variant="h5">{title}</Typography>
        </Box>
      )}
      {subtitle && <Typography variant="subtitle1">{subtitle}</Typography>}
      {helperTextRowsShown.includes(-1) ? (
        <Box my={2} textAlign="start">
          <Typography variant="body2">
            Description:{" "}
            {condition.description || "Brief escription of the condition"}
          </Typography>
          <Divider sx={{ marginY: "10px" }} />
          <Typography variant="body2">
            Example:{" "}
            {condition.example || "Simple example of how to use the condition"}
          </Typography>
        </Box>
      ) : (
        ""
      )}
    </Box>
  );
};

const UpsertCondition = (props: UpsertConditionProps) => {
  const { condition, setCondition, conditions, hideMultipleButtons } = props;
  const [helperTextRowsShown, setHelperTextRowShown] = React.useState<number[]>(
    []
  );
  const actionCapitlized =
    props.action.charAt(0).toUpperCase() + props.action.slice(1);
  const submitButtonText =
    "conditions" in condition
      ? "Continue"
      : condition._id
      ? "Update"
      : "Create";
  return (
    <Box>
      {!props.disableDescription && (
        <DescriptionButton
          title={
            !_.isNil(props.title)
              ? props.title
              : `${actionCapitlized} Condition`
          }
          condition={condition}
          helperTextRowsShown={helperTextRowsShown}
          setHelperTextRowShown={function (rows: number[]): void {
            setHelperTextRowShown(rows);
          }}
        />
      )}
      <Autocomplete
        id={`condition-type`}
        size="small"
        value={condition.type}
        disabled={props.action === "update"}
        onChange={(_event, value) => {
          if (value) {
            let newCondition = conditions.find((c) => c.type === value);
            if (!newCondition) {
              newCondition = emptyCondition();
            } else {
              newCondition = _.cloneDeep(newCondition);
              newCondition._id = condition._id;
            }
            newCondition.type = value;
            setCondition(newCondition);
          }
        }}
        options={conditions
          .filter((c) =>
            props.haveOnlyCompoundOptions
              ? "conditions" in c
              : !("conditions" in c)
          )
          .map((c) => {
            return c.type;
          })}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Condition Type"
            autoComplete="new-password"
            size="small"
          />
        )}
      />
      <DisplayFormGroup
        object={condition}
        onChange={function (condition): void {
          setCondition(condition as AbstractCondition);
        }}
        onDelete={props.onDelete as any}
        onUpdate={props.onUpdateBaseCondition as any}
        submitButtonText={submitButtonText}
        hideMultipleButtons={hideMultipleButtons}
        showCreateButton={
          _.isNil(props.showCreateButton) ? true : props.showCreateButton
        }
      />
    </Box>
  );
};

export default UpsertCondition;
