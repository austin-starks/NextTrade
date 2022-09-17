import { Typography } from "@material-ui/core";
import { Box } from "@mui/material";
import _ from "lodash";
import { AbstractField } from "../../services/outsideInterfaces";
import {
  AbstractCondition,
  CompoundCondition,
  ConditionEnum,
} from "./interface";

export const emptyCondition = (obj?: {
  _id?: string;
  type?: ConditionEnum;
  conditions?: AbstractCondition[];
}): AbstractCondition => {
  return {
    _id: "",
    name: "",
    type: "" as any,
    description: "",
    example: "",
    wasTrue: false,
    form: { fields: [] },
    ...obj,
  };
};

interface ReadOnlyConditionProps {
  condition: AbstractCondition;
}

export const removeField = (
  condition: AbstractCondition,
  name: string
): AbstractCondition => {
  const copy = _.cloneDeep(condition);
  for (let i = 0; i < copy.form.fields.length; i++) {
    const group = copy.form.fields[i];
    for (const field of group.fields) {
      if (field.name === name) {
        copy.form.fields.splice(i, 1);
      }
    }
  }
  return copy;
};

export const findField = (
  condition: AbstractCondition,
  name: string
): AbstractField => {
  const copy = _.cloneDeep(condition);
  for (let i = 0; i < copy.form.fields.length; i++) {
    const group = copy.form.fields[i];
    for (const field of group.fields) {
      if (field.name === name) {
        return field;
      }
    }
  }
  throw new Error(`Field ${name} not found`);
};

const renderField = (field: AbstractField) => {
  if (field.label === "Name") return <Box></Box>;
  const value = field.fieldType === "number" ? field.value : `"${field.value}"`;
  return (
    <Box
      key={field.name + field.label + field.value}
      display="flex"
      textAlign="start"
      justifyContent="space-between"
    >
      <Typography variant="caption">{field.label}</Typography>
      <Box mr={1}></Box>
      <Typography variant="caption">{value}</Typography>
    </Box>
  );
};

export const RenderReadOnlyBaseCondition = (props: ReadOnlyConditionProps) => {
  const { condition } = props;
  return (
    <Box>
      {condition.form.fields.map((formGroup, idx) => {
        return <Box key={idx}>{formGroup.fields.map(renderField)}</Box>;
      })}
    </Box>
  );
};
export const RenderReadOnlyCondition = (props: ReadOnlyConditionProps) => {
  const { condition } = props;
  if (condition.type === ConditionEnum.AndCondition) {
    const andCondition = condition as CompoundCondition;
    let conditions: AbstractCondition[] = andCondition.conditions;
    if (conditions.length === 0) {
      conditions = andCondition.conditions.map(
        (con) => conditions.find((c) => c._id === con._id) || emptyCondition()
      );
    }
    return (
      <Box>
        {conditions.map((condition, idx) => {
          return (
            <Box key={idx} mb={1}>
              <Typography variant="subtitle2">{condition.name}</Typography>
              <RenderReadOnlyBaseCondition condition={condition} />
              {idx < conditions.length - 1 && (
                <Box textAlign="center">
                  <Typography>AND</Typography>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    );
  }
  return (
    <Box mb={1} textAlign={"center"}>
      <Typography variant="subtitle1">{condition.name}</Typography>
      <RenderReadOnlyBaseCondition condition={condition} />
    </Box>
  );
};

export const toggleHelperText = (
  number: number,
  showHelperText: number[],
  setShowHelperText: (s: number[]) => void
) => {
  if (showHelperText.includes(number)) {
    setShowHelperText(showHelperText.filter((n) => n !== number));
  } else {
    setShowHelperText([...showHelperText, number]);
  }
};

export const sharedCardStyle = {
  "&:hover": {
    cursor: "pointer",
    backgroundColor: "white",
    color: "black",
  },
  borderRadius: "8px",
  padding: "15px",
  backdropFilter: "blur(10px)",
  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
};
