import Button from "@material-ui/core/Button";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import TextField from "@material-ui/core/TextField";
import DesktopDatePicker from "@mui/lab/DesktopDatePicker";
import { Box, Typography } from "@mui/material";
import date from "date-and-time";
import { FormikProps, useFormik } from "formik";
import React from "react";
import {
  adjectives,
  animals,
  colors,
  uniqueNamesGenerator,
} from "unique-names-generator";
import ItemList, { Item } from "../../components/ItemList";
import { TimeIntervalEnum } from "../../services/outsideInterfaces";
import { lightgrey } from "../../utils";
import TwoPageTemplate from "../templates/TwoPage";
import validationSchema from "./FormValidation";
import { IBacktest } from "./interface";

const today = new Date();

const formSchema = {
  name: uniqueNamesGenerator({
    dictionaries: [adjectives, colors, animals],
    length: 3,
    separator: " ",
    style: "capital",
  }),
  startDate: new Date(date.addDays(today, -1)),
  endDate: new Date(),
  initialValue: 10000,
  interval: TimeIntervalEnum.DAY,
};

interface Props {
  onSubmit: (values: typeof formSchema) => void;
  backtests: IBacktest[];
  onCardClick: (item: Item, idx: number) => void;
}

interface DateFieldProps {
  formik: FormikProps<typeof formSchema>;
}

const DateField = (props: DateFieldProps) => {
  const { formik } = props;
  const maxDate = date.addHours(new Date(), 1);
  const startDateError = Boolean(
    formik.errors.startDate && formik.touched.startDate
  );
  const endDateError = Boolean(formik.errors.endDate && formik.touched.endDate);
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        marginTop: "20px",
      }}
    >
      <Box>
        <DesktopDatePicker
          disableHighlightToday={true}
          minDate={new Date("01-01-2010")}
          maxDate={maxDate}
          OpenPickerButtonProps={{
            sx: { color: lightgrey, marginRight: "2px" },
          }}
          label="Start Date"
          inputFormat="MM/dd/yyyy"
          value={formik.values.startDate}
          onChange={(newValue: Date) => {
            formik.setFieldValue("startDate", newValue, true);
          }}
          renderInput={(params: any) => (
            <TextField
              error={startDateError}
              margin="dense"
              helperText={startDateError ? formik.errors.startDate : ""}
              fullWidth
              {...params}
            />
          )}
        />
      </Box>
      <Box>
        <DesktopDatePicker
          disableHighlightToday={true}
          OpenPickerButtonProps={{
            sx: { color: lightgrey, marginRight: "2px" },
          }}
          minDate={new Date("01-01-2010")}
          maxDate={maxDate}
          label="End Date"
          inputFormat="MM/dd/yyyy"
          value={formik.values.endDate}
          onChange={(newValue: Date) => {
            formik.setFieldValue("endDate", newValue, true);
          }}
          renderInput={(params: any) => (
            <TextField
              margin="dense"
              helperText={endDateError ? formik.errors.endDate : ""}
              error={endDateError}
              fullWidth
              {...params}
            />
          )}
        />
      </Box>
      <Box sx={{ minWidth: 100 }}>
        <FormControl margin="dense" fullWidth>
          <InputLabel id="date-range-select-label">Date Range</InputLabel>
          <Select
            labelId="date-range-select-label"
            id="date-range-select"
            value={formik.values.interval}
            onChange={(event) =>
              formik.setFieldValue("interval", event.target.value, true)
            }
          >
            <MenuItem value={TimeIntervalEnum.DAY}>Daily</MenuItem>
            {/* <MenuItem value={TimeIntervalEnum.HOUR}>Hourly</MenuItem> */}
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
};

function NewBacktest(props: Props) {
  const formik = useFormik({
    initialValues: formSchema,
    validationSchema: validationSchema,
    onSubmit: props.onSubmit,
  });

  const items = props.backtests.map((backtest, idx) => {
    const startDate = new Date(backtest.startDate).toDateString();
    const endDate = new Date(backtest.endDate).toDateString();
    return {
      itemKey: backtest._id,
      title: backtest.name,
      subtitle: `${startDate} - ${endDate}`,
      metadata: {
        backtest: backtest,
      },
    };
  });

  const lhs = (
    <Box mt={2}>
      <form onSubmit={formik.handleSubmit}>
        <Typography align="center" gutterBottom={true} variant={"h4"}>
          Backtest Builder
        </Typography>
        <TextField
          fullWidth
          margin="dense"
          id="name"
          name="name"
          label="Backtest Name"
          autoComplete="off"
          value={formik.values.name}
          onChange={formik.handleChange}
          error={formik.touched.name && Boolean(formik.errors.name)}
          helperText={formik.touched.name && formik.errors.name}
        />
        <DateField formik={formik} />
        <Box
          sx={{
            marginTop: "20px",
          }}
        ></Box>
        <Box m={3} sx={{ display: "flex", justifyContent: "space-around" }}>
          <Button variant="contained" type="submit">
            Run
          </Button>
        </Box>
      </form>
    </Box>
  );
  const rhs = (
    <Box>
      <Typography align="center" gutterBottom={true} variant={"h6"}>
        Past Backtests
      </Typography>
      <ItemList items={items} onCardClick={props.onCardClick} />
    </Box>
  );
  return <TwoPageTemplate navbar={false} lhs={lhs} rhs={rhs}></TwoPageTemplate>;
}
export default NewBacktest;
