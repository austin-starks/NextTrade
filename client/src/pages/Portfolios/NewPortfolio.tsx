import { FormControl, InputLabel, MenuItem, Select } from "@material-ui/core";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import { Box, Typography } from "@mui/material";
import { useFormik } from "formik";
import { useAtom } from "jotai";
import { useNavigate } from "react-router-dom";
import * as yup from "yup";
import { bannerAtom } from "../../components/Banner";
import { catchErrorCallback, createPortfolio } from "../../services/requests";
import { centeredForm } from "../../styles";
import OnePage from "../templates/OnePage";
import { IPortfolio } from "./interface";

const formSchema: IPortfolio = {
  name: "",
  main: false,
  initialValue: 10000,
};

const validationSchema = yup.object({
  name: yup.string().required("Portfolio Name is required"),
  initialValue: yup.number().min(0).required("Initial Value is required"),
});

interface NewPortfolioProps {}

function NewPortfolio(props: NewPortfolioProps) {
  const navigate = useNavigate();
  const [, setBanner] = useAtom(bannerAtom);

  const onSubmit = (values: IPortfolio) => {
    createPortfolio(values)
      .then((res) => navigate(res.data.redirectUrl))
      .catch((err) => {
        catchErrorCallback(err, navigate, setBanner);
      });
  };
  const formik = useFormik({
    initialValues: formSchema,
    validationSchema: validationSchema,
    onSubmit: onSubmit,
  });
  return (
    <OnePage>
      <Box sx={{ ...centeredForm }}>
        <form onSubmit={formik.handleSubmit}>
          <Typography align="center" gutterBottom={true} variant={"h4"}>
            Portfolio Builder
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
          <div style={{ marginTop: "10px" }}></div>
          <TextField
            fullWidth
            id="initialValue"
            name="initialValue"
            label="Initial Value"
            autoComplete="off"
            value={formik.values.initialValue}
            onChange={formik.handleChange}
            error={
              formik.touched.initialValue && Boolean(formik.errors.initialValue)
            }
            helperText={
              formik.touched.initialValue && formik.errors.initialValue
            }
            type="number"
          />
          <div style={{ marginTop: "10px" }}></div>
          <FormControl fullWidth>
            <InputLabel id="main-select-label">Make Main Portfolio?</InputLabel>
            <Select
              labelId="main-select-label"
              id="main-select"
              value={formik.values.main ? "Yes" : "No"}
              onChange={(event) => {
                if (event.target.value === "Yes") {
                  formik.setFieldValue("main", true, true);
                } else {
                  formik.setFieldValue("main", false, true);
                }
              }}
            >
              <MenuItem value={"Yes"}>Yes</MenuItem>
              <MenuItem value={"No"}>No</MenuItem>
            </Select>
          </FormControl>
          <Box
            sx={{
              marginTop: "20px",
            }}
          ></Box>
          <Box m={3} sx={{ display: "flex", justifyContent: "space-around" }}>
            <Button variant="contained" type="submit">
              Create
            </Button>
          </Box>
        </form>
      </Box>
    </OnePage>
  );
}
export default NewPortfolio;
