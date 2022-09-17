import { Add } from "@material-ui/icons";
import { Box, SxProps, Theme, Typography } from "@mui/material";
import { hoverProps } from "../../styles";
import { AbstractCondition } from "./interface";

interface DisplayConditionsProps {
  conditions: AbstractCondition[];
  emptyText?: string;
  onAddClick?: () => void;
  onCardClick: (condition: AbstractCondition, idx: number) => void;
  cardStyle?: SxProps<Theme>;
  containerStyle?: SxProps<Theme>;
  display?: string;
  justifyContent?: string;
  alignItems?: string;
  swapTitle?: boolean;
}

const DisplayConditions = (props: DisplayConditionsProps) => {
  const { conditions, swapTitle } = props;
  return (
    <Box sx={props.containerStyle}>
      {props.onAddClick && (
        <Box mt={-1} mb={-0.5} sx={hoverProps}>
          <Add
            onClick={() => {
              if (props.onAddClick) {
                props.onAddClick();
              }
            }}
          />
        </Box>
      )}
      <Box
        display={props.display}
        justifyContent={props.justifyContent}
        alignItems={props.alignItems}
      >
        {conditions.length === 0 ? (
          <Box ml={3} pb={2}>
            <Typography>{props.emptyText}</Typography>
          </Box>
        ) : (
          conditions.map((condition, idx) => {
            return (
              <Box
                onClick={() => {
                  props.onCardClick(condition, idx);
                }}
                sx={props.cardStyle}
                key={idx}
              >
                <Typography variant="subtitle2">
                  {swapTitle ? condition.name : condition.type}
                </Typography>
                <Typography variant="caption">
                  {swapTitle ? condition.type : condition.name}
                </Typography>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
};

export default DisplayConditions;
