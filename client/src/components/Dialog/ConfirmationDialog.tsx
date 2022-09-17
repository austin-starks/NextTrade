import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@material-ui/core";
import { Box } from "@mui/material";
import Button from "../Button";

interface DialogProps {
  dialogOpen: boolean;
  setDialogOpen: (boolean: boolean) => void;
  onConfirm: () => void;
  title: string;
}

const ConfirmationDialog = (props: DialogProps) => {
  const { dialogOpen, setDialogOpen, onConfirm } = props;
  const { title } = props;
  return (
    <Dialog
      disableEnforceFocus
      open={dialogOpen}
      onClose={() => {
        setDialogOpen(false);
      }}
      aria-labelledby="cancel-confirmation-title"
      aria-describedby="cancel-confirmation-dialog-description"
    >
      <Box>
        <DialogTitle id="cancel-confirmation-title">{title}</DialogTitle>
        <DialogContent>
          <DialogContentText id="cancel-confirmation-description">
            You will lose any unsaved data.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDialogOpen(false);
            }}
          >
            No
          </Button>
          <Button
            onClick={() => {
              setDialogOpen(false);
              onConfirm();
            }}
            autoFocus
          >
            Yes
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default ConfirmationDialog;
