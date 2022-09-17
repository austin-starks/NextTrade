import { Box, Grid } from "@mui/material/";
import { useAtom } from "jotai";
import _ from "lodash";
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { bannerAtom } from "../../components/Banner";
import Button from "../../components/Button";
import DisplayFormGroup from "../../components/FormControl/DisplayFormGroup";
import {
  catchErrorCallback,
  createCompoundCondition,
} from "../../services/requests";
import { emptyCondition } from "./helpers";
import { AbstractCondition, CompoundCondition } from "./interface";
import UpsertCondition from "./UpsertCondition";

interface ICompoundConditionForm {
  condition: AbstractCondition;
  conditions: AbstractCondition[];
  compoundConditions: AbstractCondition[];
  haveOnlyCompoundOptions: boolean;
  setCompoundConditions: (conditions: AbstractCondition[]) => void;
  idx: number;
  action: "create" | "update";
  hideMultipleButtons: boolean;
}

const CompoundConditionCard = (props: ICompoundConditionForm) => {
  const { condition, conditions, compoundConditions, setCompoundConditions } =
    props;
  const { idx, action, haveOnlyCompoundOptions, hideMultipleButtons } = props;
  return (
    <Grid
      item
      xs={12}
      md={4}
      p={2}
      key={idx}
      sx={{ boxShadow: "1px 4px 8px 0 rgba(0,0,0,0.2)" }}
    >
      <UpsertCondition
        hideMultipleButtons={hideMultipleButtons}
        showCreateButton={false}
        disableDescription
        conditions={conditions}
        condition={condition}
        haveOnlyCompoundOptions={haveOnlyCompoundOptions}
        setCondition={(c) => {
          const copy = _.cloneDeep(compoundConditions);
          copy[idx] = c;
          setCompoundConditions(copy);
        }}
        onDelete={() => {
          const copy = _.cloneDeep(compoundConditions);
          copy.splice(idx, 1);
          setCompoundConditions(copy);
        }}
        action={action}
        onUpdateBaseCondition={() => {}} // noop
      />
    </Grid>
  );
};

interface CompoundConditionProps {
  condition: CompoundCondition;
  conditions: AbstractCondition[];
  submitButtonText: string;
  onUpdate: (condition: CompoundCondition) => void;
  onDelete: (condition: AbstractCondition) => void;
}

const CompoundConditionForm = (props: CompoundConditionProps) => {
  const { conditions } = props;
  const [condition, setCondition] = React.useState<CompoundCondition>(
    emptyCondition({ conditions: [] }) as CompoundCondition
  );

  useEffect(() => {
    setCondition(props.condition);
  }, [props.condition]);

  const navigate = useNavigate();
  const [, setBanner] = useAtom(bannerAtom);
  const addSimpleCondition = () => {
    const copy = _.cloneDeep(condition);
    copy.conditions.push(emptyCondition());
    setCondition(copy);
  };
  const addCompoundCondition = () => {
    const copy = _.cloneDeep(condition);
    copy.conditions.push(emptyCondition({ conditions: [] }));
    setCondition(copy);
  };

  const validateAndCreate = async (
    c: CompoundCondition
  ): Promise<[CompoundCondition | null, boolean]> => {
    if (c.conditions.length < 1) {
      setBanner({
        severity: "error",
        message: "At least 1 conditions is required",
      });
      return [null, true];
    }
    if (
      c.type === ("" as any) ||
      c.conditions.find((c) => c.type === ("" as any))
    ) {
      setBanner({
        severity: "error",
        message: "All conditions must have a type",
      });
      return [null, true];
    }

    try {
      const res = await createCompoundCondition(c);
      const conditionResp = res.data.condition;
      return [conditionResp, false];
    } catch (err: any) {
      if (err.response.data.conditionError) {
        setCondition({ ...err.response.data.conditionError });
      } else {
        catchErrorCallback(err, navigate, setBanner);
      }
      return [null, true];
    }
  };

  const setCompoundConditions = (conditions: AbstractCondition[]) => {
    const copy = _.cloneDeep(condition);
    copy.conditions = conditions;
    setCondition(copy);
  };

  return (
    <Box mt={1}>
      <Box>
        <Box
          sx={{
            minWidth: "45%",
            maxWidth: "480px",
            margin: "0 auto",
          }}
        >
          <Box
            sx={{ marginTop: "12px" }}
            display="flex"
            alignItems={"center"}
            justifyContent={"space-between"}
          >
            <Button
              size="small"
              style={{ width: "160px", fontSize: "11px" }}
              variant="outlined"
              onClick={() => {
                addSimpleCondition();
              }}
            >
              + Simple Condition
            </Button>
            <Button
              size="small"
              style={{ width: "160px", fontSize: "11px" }}
              variant="outlined"
              onClick={() => {
                addCompoundCondition();
              }}
            >
              + Compound Condition
            </Button>
          </Box>
          <DisplayFormGroup
            object={condition}
            onChange={(c) => {
              setCondition(c as CompoundCondition);
            }}
            onDelete={props.onDelete as any}
            onUpdate={async () => {}}
            submitButtonText={""}
            hideMultipleButtons={false}
            showCreateButton={false}
          />
        </Box>

        <Grid container mt={1}>
          {condition.conditions.map((c, idx) => {
            const action = c._id === "" ? "create" : "update";
            if ("conditions" in c) {
              return (
                <CompoundConditionCard
                  hideMultipleButtons={true}
                  key={idx}
                  haveOnlyCompoundOptions={true}
                  condition={c}
                  conditions={conditions}
                  compoundConditions={condition.conditions}
                  setCompoundConditions={setCompoundConditions}
                  idx={idx}
                  action={action}
                />
              );
            }
            return (
              <CompoundConditionCard
                hideMultipleButtons={false}
                key={idx}
                haveOnlyCompoundOptions={false}
                condition={c}
                conditions={conditions}
                compoundConditions={condition.conditions}
                setCompoundConditions={setCompoundConditions}
                idx={idx}
                action={action}
              />
            );
          })}
        </Grid>
        <Box display="flex" justifyContent="space-evenly">
          <Button
            style={{ width: "80px", marginTop: "15px" }}
            onClick={async () => {
              const [compound, err] = await validateAndCreate(condition);
              if (err) {
                return;
              }
              if (compound) {
                // compound.conditions = compound.conditions.map((c) => {
                //   const filteredCondition = removeField(c, "name");
                //   if ("conditions" in filteredCondition) {
                //     (filteredCondition as CompoundCondition).conditions = (
                //       filteredCondition as CompoundCondition
                //     ).conditions.map((c) => removeField(c, "name"));
                //   }
                //   return filteredCondition;
                // });
                props.onUpdate(compound);
              } else {
                setBanner({
                  severity: "error",
                  message: "Something went wrong",
                });
              }
            }}
            variant="contained"
          >
            {props.submitButtonText}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default CompoundConditionForm;
