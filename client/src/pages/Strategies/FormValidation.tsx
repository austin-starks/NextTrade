import * as yup from "yup";

const validationSchema = yup.object({
  name: yup.string().required("Strategy name is required"),
  targetAsset: yup.object({
    name: yup
      .string()
      .required("Target asset name is required")
      .matches(/^[a-zA-Z]+$/, "Target asset can only contain letters")
      .min(2, "Target asset needs at least two characters")
      .max(5, "Target asset can't be more than 5 characters"),
    type: yup.string().required("Asset type is required"),
  }),
  buyAmount: yup.object({
    amount: yup
      .number()
      .min(0, "Buy amount must be greater than 0")
      .required("Buy amount is required"),
    type: yup.string().required("Buy amount type is required"),
  }),
  sellAmount: yup.object({
    amount: yup
      .number()
      .min(0, "Sell amount must be greater than 0")
      .required("Sell amount is required"),
    type: yup.string().required("Sell amount type is required"),
  }),
});

export default validationSchema;
