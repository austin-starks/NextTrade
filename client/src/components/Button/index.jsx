import { Button } from "@material-ui/core";
import { styled } from "@mui/material";

export default Button;

export const HoverButton = styled(Button)(() => ({
  ":hover": {
    cursor: "pointer",
  },
}));
