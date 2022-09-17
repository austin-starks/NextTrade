import {
  darkgray,
  darkgrey,
  gray,
  green,
  grey,
  pink,
  red,
  yellowGreen,
} from "../utils";

export const FACT_LIST_CARD_STYLE_NO_BORDER = {
  display: "flex",
  justifyContent: "space-between",
  padding: "3px",
};

export const FACT_LIST_CARD_STYLE = {
  display: "flex",
  justifyContent: "space-between",
  borderBottom: "1px solid" + gray,
  padding: "3px",
};

export const FACT_LIST_CONTAINER_STYLE = {
  width: "90%",
  margin: "0 auto",
  marginTop: "15px",
  marginBottom: "25px",
};

export const borderColor = "1px solid rgba(255, 255, 255, 0.1)";
export const thickBorderColor = "2px solid rgba(255, 255, 255, 0.1)";
export { green, red, pink, yellowGreen, grey, gray, darkgray, darkgrey };
export const greyBox = {
  background: darkgrey,
  borderRadius: "16px",
  boxShadow: "inset 0 0 0 300px rgba(0, 0, 0, 0.2)",
  backdropFilter: "blur(10px)",
  border: borderColor,
};
export const centeredForm = {
  maxWidth: "500px",
  paddingLeft: "30px",
  paddingRight: "30px",
  paddingTop: "25px",
  paddingBottom: "25px",
  marginLeft: "auto",
  marginRight: "auto",
  marginTop: "30px",
  ...greyBox,
};

export const centeredContent = {
  ...centeredForm,
  maxWidth: "90%",
  marginTop: "20px",
  marginBottom: "25px",
  maxHeight: "65vh",
  overflowY: "scroll",
};

export const hoverProps = {
  "&:hover": {
    cursor: "pointer",
    textDecoration: "underline",
  },
};

export const hoverWhiteBackground = {
  "&:hover": {
    cursor: "pointer",
    backgroundColor: "white",
    color: "black",
  },
};
