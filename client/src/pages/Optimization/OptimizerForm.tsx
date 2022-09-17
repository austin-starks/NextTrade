import { Typography } from "@mui/material";
import { Box } from "@mui/system";
import DisplayFormGroup from "../../components/FormControl/DisplayFormGroup";
import { IFormControl } from "../../services/outsideInterfaces";

interface IForm {
  form: IFormControl;
}

interface IOptimizerForm {
  optimizerForm: IForm;
  setOptimizerForm: (form: IForm) => void;
  onUpdate: (form: IForm) => Promise<void>;
}

const OptimizerForm = (props: IOptimizerForm) => {
  const { optimizerForm, setOptimizerForm, onUpdate } = props;
  return (
    <Box mt={2}>
      <Typography align="center" gutterBottom={true} variant={"h4"}>
        Optimizer Builder
      </Typography>
      <DisplayFormGroup
        sx={{ marginTop: "10px" }}
        object={optimizerForm}
        onChange={(o) => {
          setOptimizerForm(o as any);
        }}
        onUpdate={async (form) => {
          props.onUpdate(form);
        }}
        showCreateButton={true}
        submitButtonText={"Submit"}
      />
    </Box>
  );
};

export default OptimizerForm;
