import MuiAlert, { AlertProps } from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import { atom, useAtom } from "jotai";
import React from "react";

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref
) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

export default function Banner(props: {
  banner: { message: string; severity: "error" | "success" };
  handleClose: () => void;
}) {
  return (
    <Snackbar
      open={props.banner.message !== ""}
      autoHideDuration={2000}
      onClose={props.handleClose}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      sx={{ width: "100%" }}
    >
      <Alert severity={props.banner.severity}>{props.banner.message}</Alert>
    </Snackbar>
  );
}

export { useAtom };

export const bannerAtom = atom<{
  message: string;
  severity: "error" | "success";
}>({
  message: "",
  severity: "error",
});
