import Box from "@mui/material/Box";
import Modal from "@mui/material/Modal";
import * as React from "react";
import { darkgrey } from "../../utils";

const style = {
  position: "absolute" as "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  bgcolor: darkgrey,
  boxShadow: 24,
  p: 4,
  textAlign: "center",
  outline: 0,
  overflow: "scroll",
  borderRadius: "16px",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  paddingLeft: "50px",
  paddingRight: "50px",
};

const regularSize = {
  width: "500px",
  maxHeight: "75%",
  maxWidth: "500px",
};

const largeSize = {
  width: "1200px",
  maxHeight: "85%",
  maxWidth: "90%",
};

interface ModalProps {
  open: boolean;
  handleClose: (
    event: React.MouseEvent<HTMLButtonElement>,
    reason: string
  ) => void;
  children: React.ReactNode;
  sx?: React.CSSProperties;
  size?: "sm" | "lg";
}

export default function BasicModal(props: ModalProps) {
  const { size } = props;
  const modalSize = size === "lg" ? largeSize : regularSize;
  return (
    <Modal
      open={props.open}
      onClose={props.handleClose}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Box sx={{ ...style, ...props.sx, ...modalSize }}>{props.children}</Box>
    </Modal>
  );
}
