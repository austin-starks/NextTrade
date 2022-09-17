import { Chip, Tooltip } from "@mui/material";
import { StatusEnum } from "../../services/outsideInterfaces";

export const getChip = (status: StatusEnum, tooltipText: string) => {
  switch (status) {
    case StatusEnum.ERROR:
      return (
        <Tooltip placement="top" title={tooltipText}>
          <Chip color="error" size="small" label={status} />
        </Tooltip>
      );
    case StatusEnum.COMPLETE:
      return <Chip color="success" size="small" label={status} />;
    default:
      return <Chip color="warning" size="small" label={status} />;
  }
};
