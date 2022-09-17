import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@material-ui/core";
import { Box, Typography } from "@mui/material";
import { FormikProps, useFormik } from "formik";
import { useAtom } from "jotai";
import _ from "lodash";
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { bannerAtom } from "../../components/Banner";
import Button from "../../components/Button";
import Modal from "../../components/Modal";
import {
  AllocationEnum,
  AssetTypeEnum,
} from "../../services/outsideInterfaces";
import {
  catchErrorCallback,
  createConditionFromForm,
  getConditions,
} from "../../services/requests";
import { getAssetType, lightgrey } from "../../utils";
import CompoundConditionForm from "../Condition/CompoundConditionForm";
import DisplayConditions from "../Condition/DisplayConditions";
import { emptyCondition, sharedCardStyle } from "../Condition/helpers";
import {
  AbstractCondition,
  CompoundCondition,
  ConditionEnum,
} from "../Condition/interface";
import UpsertCondition from "../Condition/UpsertCondition";
import validationSchema from "./FormValidation";
import { IStrategy } from "./interface";

type ConditionQueue = Array<[CompoundCondition, number[]]>;

type side = "buy" | "sell";

const formSchema = {
  _id: "",
  name: "",
  targetAsset: {
    name: "",
    type: AssetTypeEnum.STOCK,
    symbol: "",
  },
  buyAmount: {
    amount: "" as number | "",
    type: AllocationEnum.DOLLARS,
  },
  sellAmount: {
    amount: "" as number | "",
    type: AllocationEnum.DOLLARS,
  },
  buyingConditions: [] as AbstractCondition[],
  sellingConditions: [] as AbstractCondition[],
};
export type StrategyForm = typeof formSchema;

export type FormikStrategyProps = FormikProps<StrategyForm>;

export function emptyStrategy(): IStrategy {
  return {
    _id: "",
    userId: "",
    name: "",
    targetAsset: {
      name: "",
      symbol: "",
      type: AssetTypeEnum.STOCK,
    },
    buyAmount: {
      amount: 0,
      type: AllocationEnum.DOLLARS,
    },
    sellAmount: {
      amount: 0,
      type: AllocationEnum.DOLLARS,
    },
    buyingConditions: [],
    sellingConditions: [],
  };
}

interface StrategyProps {
  onEdit: (strategy: StrategyForm) => void;
  onDelete: (id: string) => void;
  initialValues?: IStrategy;
  submitButtonText?: string;
  onSubmit: (values: typeof formSchema) => Promise<Error | null>;
}

interface AssetFieldProps {
  formik: FormikStrategyProps;
  disabled: boolean;
  onChange: () => void;
}

interface AllocationProps {
  formik: FormikStrategyProps;
  action: side;
  disabled: boolean;
  onChange: () => void;
}

const AssetField = (props: AssetFieldProps) => {
  const { formik } = props;
  let targetAssetNameError: boolean =
    Boolean(formik.touched.targetAsset) &&
    Boolean(formik.touched.targetAsset!.name) &&
    Boolean(formik.errors.targetAsset) &&
    Boolean(formik.errors.targetAsset!.name);

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        marginTop: "20px",
        textAlign: "start",
      }}
    >
      <TextField
        fullWidth
        disabled={props.disabled}
        id="targetAssetName"
        name="targetAsset.name"
        label="Asset Symbol"
        placeholder="NVDA"
        autoComplete="off"
        value={formik.values.targetAsset.name}
        error={targetAssetNameError}
        helperText={targetAssetNameError ? formik.errors.targetAsset!.name : ""}
        onChange={(event) => {
          formik.setFieldValue(
            "targetAsset.name",
            event.target.value.toUpperCase(),
            true
          );
          props.onChange();
        }}
      />
      <FormControl disabled={props.disabled} fullWidth>
        <InputLabel id="asset-type-select-label">Asset Type</InputLabel>
        <Select
          labelId="asset-type-select-label"
          id="asset-type-select"
          value={formik.values.targetAsset.type}
          onChange={(event) =>
            formik.setFieldValue("targetAsset.type", event.target.value, true)
          }
        >
          <MenuItem value={AssetTypeEnum.STOCK}>Stock</MenuItem>
          {/* <MenuItem value={AssetTypeEnum.OPTION}>Option</MenuItem>
          <MenuItem value={AssetTypeEnum.CRYPTO}>Crypto</MenuItem> */}
        </Select>
      </FormControl>
    </Box>
  );
};

const AllocationField = (props: AllocationProps) => {
  const { formik, action } = props;
  let valueError: boolean =
    Boolean(formik.touched[`${action}Amount`]) &&
    Boolean(formik.touched[`${action}Amount`]!.amount) &&
    Boolean(formik.errors[`${action}Amount`]) &&
    Boolean(formik.errors[`${action}Amount`]!.amount);
  const actionCapitalized = action.charAt(0).toUpperCase() + action.slice(1);
  const numAssets = getAssetType(formik.values.targetAsset);
  const selectValues = [
    { value: AllocationEnum.DOLLARS, label: "Dollars" },
    { value: AllocationEnum.NUM_ASSETS, label: numAssets },
    {
      value: AllocationEnum.PERCENT_OF_BUYING_POWER,
      label: "Percent of buying power",
    },
    {
      value: AllocationEnum.PERCENT_OF_PORTFOLIO,
      label: "Percent of portfolio value",
    },
    {
      value: AllocationEnum.PERCENT_OF_CURRENT_POSITIONS,
      label: "Percent of current positions",
    },
  ];

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        marginTop: "20px",
        textAlign: "start",
      }}
    >
      <TextField
        fullWidth
        id={`${action}AmountValue`}
        name={`${action}Amount.amount`}
        label={`${actionCapitalized} Amount`}
        type="number"
        autoComplete="off"
        value={formik.values[`${action}Amount`].amount}
        error={valueError}
        helperText={valueError ? formik.errors[`${action}Amount`]!.amount : ""}
        onChange={(e) => {
          formik.handleChange(e);
          props.onChange();
        }}
        disabled={props.disabled}
      />
      <FormControl fullWidth>
        <InputLabel id={`${action}-amount-type-select-label`}>
          {actionCapitalized} Amount Type
        </InputLabel>
        <Select
          labelId={`${action}-amount-type-select-label`}
          id={`${action}-amount-type-select`}
          value={formik.values[`${action}Amount`].type}
          disabled={props.disabled}
          onChange={(event) =>
            formik.setFieldValue(
              `${action}Amount.type`,
              event.target.value,
              true
            )
          }
        >
          {selectValues.map(({ value, label }, idx) => (
            <MenuItem key={idx} value={value}>
              {label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

interface IConditionModal {
  side: "buy" | "sell";
  currentConditions: AbstractCondition[];
  conditionTypes: AbstractCondition[];
  onCreate: (condition: AbstractCondition, side: side) => void;
  onDelete: (condition: AbstractCondition, side: side) => void;
  size: "sm" | "lg";
  setModalSize: (size: "sm" | "lg") => void;
}

const ConditionModal = (props: IConditionModal) => {
  const { side, currentConditions, conditionTypes } = props;
  const sideCapitalized = side.charAt(0).toUpperCase() + side.slice(1);
  const [condition, setCondition] = React.useState<AbstractCondition | null>(
    null
  );
  const [compoundCondition, setCompoundCondition] =
    React.useState<CompoundCondition | null>(null);

  const navigate = useNavigate();
  const [, setBanner] = useAtom(bannerAtom);

  const queue = React.useRef<ConditionQueue>([]);
  const prevPos = React.useRef<number[]>([]);

  const dfs = (compound: CompoundCondition, pos: number[]) => {
    const tmp: ConditionQueue = [];
    compound.conditions.forEach((c, idx) => {
      if ("conditions" in c) {
        tmp.push([c as CompoundCondition, [...pos, idx]]);
      }
    });
    queue.current = [...tmp, ...queue.current];
  };
  const onUpdateCompoundCondition = (newCondition: AbstractCondition) => {
    let copy: CompoundCondition;
    dfs(newCondition as CompoundCondition, [...prevPos.current]);
    if (prevPos.current.length === 0) {
      copy = _.cloneDeep(newCondition) as CompoundCondition;
    } else {
      copy = _.cloneDeep(condition) as CompoundCondition;
      _.set(
        copy,
        prevPos.current.map((n) => `conditions[${n}]`).join("."),
        newCondition
      );
    }
    const elt = queue.current.shift();
    if (elt) {
      const [c, pos] = elt;
      setCondition(copy);
      setCompoundCondition(c);
      prevPos.current = pos;
    } else {
      props.onCreate(copy as CompoundCondition, side);
      props.setModalSize("sm");
      setCompoundCondition(null);
      setCondition(null);
    }
  };

  const currentCondition =
    compoundCondition ||
    (_.cloneDeep(
      conditionTypes.find((c) => c.type === condition?.type)
    ) as CompoundCondition) ||
    (emptyCondition({
      conditions: [],
      type: (condition as any)?.type,
    }) as CompoundCondition);

  return (
    <Box>
      {!condition ? (
        <Box>
          <Typography variant="h6">{sideCapitalized}ing Conditions</Typography>
          <DisplayConditions
            cardStyle={{ ...sharedCardStyle }}
            conditions={[
              {
                ...emptyCondition(),
                name: `This creates a complex ${side}ing condition`,
                type: "New Compound Condition" as ConditionEnum,
              },
            ]}
            onCardClick={(c) => {
              const condition = emptyCondition({
                type: "__Display Compound Condition" as ConditionEnum,
              });
              setCondition(condition);
            }}
          />
          <DisplayConditions
            cardStyle={{ ...sharedCardStyle }}
            conditions={currentConditions}
            onCardClick={(c: AbstractCondition, idx: number) => {
              const copy: any = _.cloneDeep(c);
              if ("conditions" in c) {
                setCompoundCondition(copy as CompoundCondition);
                props.setModalSize("lg");
              }
              setCondition(copy);
            }}
          />
        </Box>
      ) : condition.type ===
        ("__Display Compound Condition" as ConditionEnum) ? (
        <Box>
          <Typography variant="h6">{sideCapitalized}ing Conditions</Typography>
          <DisplayConditions
            cardStyle={{ ...sharedCardStyle }}
            conditions={[
              {
                ...emptyCondition({ conditions: [] }),
                name: `All of the conditions must be true`,
                type: ConditionEnum.AndCondition,
              },
              {
                ...emptyCondition({ conditions: [] }),
                name: `The conditions must be true sequentially`,
                type: ConditionEnum.ThenCondition,
              },
              {
                ...emptyCondition({ conditions: [] }),
                name: `Any condition must be true`,
                type: ConditionEnum.OrCondition,
              },
            ]}
            onCardClick={(con) => {
              con.name = "";
              props.setModalSize("lg");
              setCondition(
                conditionTypes.find((c) => c.type === con.type) || con
              );
            }}
          />
        </Box>
      ) : "conditions" in condition ? (
        <Box>
          <Typography variant="h6">{currentCondition.type}</Typography>
          <Typography variant="caption">{currentCondition.name}</Typography>
          <CompoundConditionForm
            condition={currentCondition}
            conditions={conditionTypes}
            submitButtonText={"Submit"}
            onUpdate={onUpdateCompoundCondition}
            onDelete={(condition: AbstractCondition) => {
              props.onDelete(condition, side);
              props.setModalSize("sm");
            }}
          />
        </Box>
      ) : (
        <UpsertCondition
          condition={condition}
          conditions={conditionTypes}
          setCondition={(c: AbstractCondition) => {
            setCondition(c);
          }}
          onDelete={(condition) => {
            props.onDelete(condition, side);
          }}
          onUpdateBaseCondition={(condition: AbstractCondition) => {
            createConditionFromForm({ ...condition })
              .then((res) => {
                props.onCreate(res.data.condition, side);
                props.setModalSize("sm");
              })
              .catch((err) => {
                if (err.response.data.form) {
                  setCondition({
                    ...condition,
                    form: err.response.data.form,
                  });
                } else {
                  catchErrorCallback(err, navigate, setBanner);
                }
              });
          }}
          action={condition?._id ? "update" : "create"}
        />
      )}
    </Box>
  );
};

function NewStrategy(props: StrategyProps) {
  const formik = useFormik({
    initialValues: props.initialValues || formSchema,
    validationSchema: validationSchema,
    onSubmit: props.onSubmit,
  });
  const hasId = !!props.initialValues?._id;
  const [disabled, setDisabled] = React.useState(hasId);
  const [modalSize, setModalSize] = React.useState<"sm" | "lg">("sm");
  const [edited, setEdited] = React.useState(false);
  const [modalState, setModalState] = React.useState<IConditionModal | null>(
    null
  );
  const navigate = useNavigate();
  const [, setBanner] = useAtom(bannerAtom);
  const [conditionTypes, setConditionTypes] = React.useState<
    AbstractCondition[]
  >([]);
  const onCreateCondition = (condition: AbstractCondition, side: side) => {
    const newConditions = [
      condition,
      ...formik.values[`${side}ingConditions`].filter(
        (c) => c._id !== condition._id
      ),
    ];
    formik.setFieldValue(`${side}ingConditions`, newConditions);
    setModalState(null);
    setEdited(true);
  };

  const onDeleteCondition = (condition: AbstractCondition, side: side) => {
    const newConditions = [
      ...formik.values[`${side}ingConditions`].filter(
        (c) => c._id !== condition._id
      ),
    ];
    formik.setFieldValue(`${side}ingConditions`, newConditions);
    setModalState(null);
    setEdited(true);
  };

  useEffect(() => {
    getConditions()
      .then((res) => {
        setConditionTypes(res.data.conditions);
      })
      .catch((err) => {
        catchErrorCallback(err, navigate, setBanner);
      });
  }, [navigate, setBanner]);
  return (
    <Box>
      {
        <Modal
          size={modalSize}
          open={modalState !== null}
          handleClose={() => {
            setModalState(null);
            setModalSize("sm");
          }}
        >
          {modalState && <ConditionModal {...modalState} />}
        </Modal>
      }
      <form onSubmit={formik.handleSubmit}>
        <TextField
          disabled={disabled}
          fullWidth
          id="name"
          name="name"
          label="Strategy Name"
          autoComplete="off"
          placeholder="NVDA Buy Divergence Intraday"
          value={formik.values.name}
          onChange={(e) => {
            formik.handleChange(e);
            setEdited(true);
          }}
          error={formik.touched.name && Boolean(formik.errors.name)}
          helperText={formik.touched.name && formik.errors.name}
        />
        <AssetField
          onChange={() => {
            setEdited(true);
          }}
          disabled={disabled}
          formik={formik}
        />
        <AllocationField
          onChange={() => {
            setEdited(true);
          }}
          disabled={disabled}
          formik={formik}
          action="buy"
        />
        <AllocationField
          onChange={() => {
            setEdited(true);
          }}
          disabled={disabled}
          formik={formik}
          action="sell"
        />
        <Box
          mt={2}
          sx={{ color: disabled ? "#6f7378" : lightgrey }}
          textAlign="start"
        >
          <Typography variant="body2"> Conditions (click to edit)</Typography>
          <Box display={"flex"} justifyContent={"space-between"}>
            <Button
              onClick={() => {
                setModalState({
                  side: "buy",
                  currentConditions: formik.values.buyingConditions,
                  conditionTypes,
                  onCreate: onCreateCondition,
                  onDelete: onDeleteCondition,
                  size: modalSize,
                  setModalSize: setModalSize,
                });
              }}
              disabled={disabled}
            >
              {formik.values.buyingConditions.length} buying conditions
            </Button>
            <Button
              onClick={() => {
                setModalState({
                  side: "sell",
                  currentConditions: formik.values.sellingConditions,
                  conditionTypes,
                  onCreate: onCreateCondition,
                  onDelete: onDeleteCondition,
                  size: modalSize,
                  setModalSize: setModalSize,
                });
              }}
              disabled={disabled}
            >
              {formik.values.sellingConditions.length} selling conditions
            </Button>
          </Box>
        </Box>

        <Box mt={4} display="flex" justifyContent="space-around">
          <Button
            onClick={() => {
              props.onDelete(formik.values._id);
            }}
            disabled={disabled}
            variant="contained"
          >
            {"Delete"}
          </Button>
          {!hasId ? (
            <Button variant="contained" type="submit">
              {"Create"}
            </Button>
          ) : (
            <Button
              onClick={async () => {
                if (edited) {
                  const err = await props.onSubmit(formik.values);
                  if (!err) {
                    setDisabled(!disabled);
                    setEdited(false);
                  }
                } else {
                  setDisabled(!disabled);
                }
                props.onEdit(formik.values);
              }}
              variant="contained"
            >
              {disabled ? "Edit" : !edited ? "Cancel" : "Save"}
            </Button>
          )}
        </Box>
      </form>
    </Box>
  );
}

export default NewStrategy;
