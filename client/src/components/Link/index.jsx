import { Link } from "@material-ui/core";
import { styled } from "@mui/material";

export const HoverLink = styled(Link)(() => ({
  ":hover": {
    cursor: "pointer",
  },
}));
