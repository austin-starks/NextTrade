import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Typography from "@material-ui/core/Typography";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Link from "@mui/material/Link";
import { useFormik } from "formik";
import { useNavigate } from "react-router-dom";
import * as yup from "yup";
import { bannerAtom, useAtom } from "../../components/Banner";
import { register } from "../../services/requests";
import { centeredForm } from "../../styles";
import OnePage from "../templates/OnePage";

const validationSchema = yup.object({
  firstName: yup.string().required("First Name is required"),
  lastName: yup.string().required("Last Name is required"),
  email: yup.string().email().required("Email is required"),
  password: yup
    .string()
    .min(8, "Password should be of minimum 8 characters length")
    .required("Password is required"),
  confirmPassword: yup
    .string()
    .required("Confirm Password is required")
    .oneOf([yup.ref("password"), null], "Passwords must match"),
});

const RegistrationPage = () => {
  let navigate = useNavigate();
  const [, setBanner] = useAtom(bannerAtom);

  const formik = useFormik({
    initialValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      remember: true,
    },
    validationSchema: validationSchema,
    onSubmit: (values) => {
      register(values)
        .then((response) => {
          setBanner({ severity: "success", message: response.data.message });
          setTimeout(() => {
            navigate("/portfolio");
            setBanner({ severity: "success", message: "" });
          }, 400);
        })
        .catch((err) => {
          setBanner({ severity: "error", message: err.response.data.message });
        });
    },
  });

  return (
    <OnePage navbar={false}>
      <div>
        <form
          style={{ ...centeredForm, marginTop: "60px" }}
          onSubmit={formik.handleSubmit}
        >
          <Typography align="center" gutterBottom={true} variant={"h4"}>
            Register
          </Typography>
          <TextField
            fullWidth
            id="firstName"
            label="First Name"
            name="firstName"
            autoComplete="off"
            value={formik.values.firstName}
            onChange={formik.handleChange}
            error={formik.touched.firstName && Boolean(formik.errors.firstName)}
            helperText={formik.touched.firstName && formik.errors.firstName}
          />
          <div style={{ marginTop: "10px" }}></div>
          <TextField
            fullWidth
            id="lastName"
            label="Last Name"
            name="lastName"
            autoComplete="off"
            value={formik.values.lastName}
            onChange={formik.handleChange}
            error={formik.touched.lastName && Boolean(formik.errors.lastName)}
            helperText={formik.touched.lastName && formik.errors.lastName}
          />
          <div style={{ marginTop: "10px" }}></div>
          <TextField
            fullWidth
            id="email"
            name="email"
            label="Email"
            autoComplete="off"
            value={formik.values.email}
            onChange={formik.handleChange}
            error={formik.touched.email && Boolean(formik.errors.email)}
            helperText={formik.touched.email && formik.errors.email}
          />
          <div style={{ marginTop: "10px" }}></div>
          <TextField
            fullWidth
            id="password"
            name="password"
            label="Password"
            type="password"
            autoComplete="off"
            value={formik.values.password}
            onChange={formik.handleChange}
            error={formik.touched.password && Boolean(formik.errors.password)}
            helperText={formik.touched.password && formik.errors.password}
          />
          <div style={{ marginTop: "10px" }}></div>
          <TextField
            fullWidth
            id="confirmPassword"
            name="confirmPassword"
            label="Confirm Password"
            type="password"
            autoComplete="off"
            value={formik.values.confirmPassword}
            onChange={formik.handleChange}
            error={
              formik.touched.confirmPassword &&
              Boolean(formik.errors.confirmPassword)
            }
            helperText={
              formik.touched.confirmPassword && formik.errors.confirmPassword
            }
          />
          <div style={{ marginTop: "10px" }}></div>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={formik.values.remember}
                  value={formik.values.remember}
                  onChange={formik.handleChange}
                  size="small"
                  id="remember"
                  name="remember"
                  sx={{
                    color: "#9e9e9e",
                    "&.Mui-checked": {
                      color: "white",
                    },
                  }}
                />
              }
              label="Remember Me"
              sx={{
                color: formik.values.remember ? "white" : "#9e9e9e",
              }}
            />
            <Link color="inherit" href="/login">
              Have an account? Login here
            </Link>
          </Box>
          <div style={{ marginTop: "10px" }}></div>
          <Box m={5}>
            <Button variant="contained" fullWidth type="submit">
              Submit
            </Button>
          </Box>
        </form>
      </div>
    </OnePage>
  );
};

export default RegistrationPage;
