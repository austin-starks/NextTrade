import { Divider, SxProps, Theme } from "@mui/material/";

interface DividerProps {
  sx?: SxProps<Theme> | undefined;
}

const StyledDivder = (props: DividerProps) => {
  return <Divider sx={{ backgroundColor: "#606060", ...props.sx }} />;
};

export default StyledDivder;
