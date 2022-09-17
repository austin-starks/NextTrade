import {
  Box,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
} from "@material-ui/core/";
import Button from "@material-ui/core/Button";
import { Typography } from "@mui/material";
import Checkbox from "@mui/material/Checkbox";
import { useFormik } from "formik";
import React, { useEffect } from "react";
import * as yup from "yup";
import { DeploymentEnum } from "../../services/outsideInterfaces";
import { AbstractPortfolio, IPortfolio } from "./interface";

interface DeploymentFormProps {
  onSubmit: (values: IPortfolio) => void;
  portfolio?: AbstractPortfolio;
}

const formSchema = {
  name: "",
  main: false,
  active: false,
  deployment: DeploymentEnum.PAPER,
};

const validationSchema = yup.object({
  name: yup.string(),
});

export function DeploymentForm(props: DeploymentFormProps) {
  const formik = useFormik({
    initialValues: formSchema,
    validationSchema: validationSchema,
    onSubmit: props.onSubmit,
  });

  useEffect(() => {
    formik.setFieldValue("name", props?.portfolio?.name || "", false);
    formik.setFieldValue("active", props?.portfolio?.active || false, false);
    formik.setFieldValue("main", props?.portfolio?.main || false, false);
    formik.setFieldValue(
      "deployment",
      props?.portfolio?.deployment || DeploymentEnum.PAPER,
      false
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props?.portfolio]);

  if (!props.portfolio) {
    return <React.Fragment></React.Fragment>;
  }

  return (
    <React.Fragment>
      <form onSubmit={formik.handleSubmit}>
        <Typography align="center" gutterBottom={true} variant={"h4"}>
          Settings
        </Typography>
        <TextField
          fullWidth
          id="name"
          name="name"
          label="Portfolio Name"
          autoComplete="off"
          value={formik.values.name}
          onChange={formik.handleChange}
          error={formik.touched.name && Boolean(formik.errors.name)}
          helperText={formik.touched.name && formik.errors.name}
        />
        <Box m={3}></Box>
        <Typography sx={{ fontWeight: "bold", textAlign: "start" }}>
          Deployment
        </Typography>
        <Box display="flex" justifyContent={"space-between"} alignItems="end">
          <FormControl component="fieldset">
            <RadioGroup
              aria-label="deployment"
              name="deployment"
              value={formik.values.deployment}
              onChange={formik.handleChange}
            >
              <FormControlLabel
                value={DeploymentEnum.PAPER}
                control={<Radio />}
                label="Paper Trading"
              />
              <FormControlLabel
                disabled
                value={DeploymentEnum.LIVE}
                control={<Radio />}
                label="Live Trading"
              />
            </RadioGroup>
          </FormControl>
          <FormControl component="fieldset">
            <FormControlLabel
              control={
                <Checkbox
                  checked={formik.values.main}
                  value={formik.values.main}
                  onChange={formik.handleChange}
                  size="small"
                  id="main"
                  name="main"
                  sx={{
                    color: "#9e9e9e",
                    "&.Mui-checked": {
                      color: "white",
                    },
                  }}
                />
              }
              label="main"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formik.values.active}
                  value={formik.values.active}
                  onChange={formik.handleChange}
                  size="small"
                  id="active"
                  name="active"
                  sx={{
                    color: "#9e9e9e",
                    "&.Mui-checked": {
                      color: "white",
                    },
                  }}
                />
              }
              label="Active"
            />
          </FormControl>
        </Box>
        <Box m={3} sx={{ display: "flex", justifyContent: "space-around" }}>
          <Button variant="contained" type="submit">
            Save
          </Button>
        </Box>
      </form>
    </React.Fragment>
  );
}
