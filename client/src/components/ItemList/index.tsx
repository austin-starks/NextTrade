import { Box, SxProps, Theme, Typography } from "@mui/material";
import { sharedCardStyle } from "../../pages/Condition/helpers";

export interface Item {
  itemKey: string | number;
  title: string | JSX.Element;
  subtitle?: number | string | JSX.Element;
  metadata: any;
  style?: SxProps<Theme>;
}

interface ItemListProps {
  items: Item[];
  onCardClick: (item: Item, idx: number) => void;
  containerStyle?: SxProps<Theme>;
  customCardStyle?: SxProps<Theme>;
}

const getLine = (
  title: string | JSX.Element | number | undefined,
  variant = "subtitle2"
) => {
  if (typeof title === "string" || typeof title === "number" || !title) {
    return <Typography variant={variant as any}>{title}</Typography>;
  }
  return title;
};

const ItemList = (props: ItemListProps) => {
  const { items, onCardClick, customCardStyle, containerStyle } = props;
  return (
    <Box sx={containerStyle}>
      {items.map((item, idx) => {
        return (
          <Box
            onClick={() => {
              onCardClick(item, idx);
            }}
            sx={item.style || customCardStyle || sharedCardStyle}
            key={item.itemKey}
          >
            {getLine(item.title)}
            {getLine(item.subtitle, "caption")}
          </Box>
        );
      })}
    </Box>
  );
};

export default ItemList;
