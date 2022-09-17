import date from "date-and-time";
import * as yup from "yup";

const validationSchema = yup.object({
  name: yup.string().required("First Name is required"),
  startDate: yup
    .date()
    .min(new Date("01-01-2010"), "Start date must be after 01/01/2010"),
  endDate: yup
    .date()
    .min(yup.ref("startDate"), "End date can't be before start date")
    .max(date.addDays(new Date(), 1), "End date can't be after today"),
  interval: yup.string().required("Date range is required"),
  initialValue: yup
    .number()
    .min(0, "InitialValue must be greater than 0")
    .required("Initial value is required"),
  strategies: yup.array(),
});

export default validationSchema;
