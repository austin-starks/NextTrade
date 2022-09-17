import { Box, List, ListItem, ListItemText, Typography } from "@mui/material/";
import React from "react";
import { PositionInfo } from "../../services/outsideInterfaces";
import { commifyLargeNumber, green, red } from "../../utils";
import Divider from "../Divider";

interface IListAllAssets {
  options?: Array<PositionInfo>;
  stocks?: Array<PositionInfo>;
  cryptocurrencies?: Array<PositionInfo>;
  watchlist?: Array<PositionInfo>;
  height?: number;
}

interface IListAssets {
  assets: Array<PositionInfo>;
  assetType: string;
}

const ListAllAssets = (props: IListAllAssets) => {
  return (
    <Box
      sx={{
        border: "0.1px solid #606060",
        maxHeight: `${props.height || 600}px`,
        overflowY: "scroll",
      }}
    >
      {props.options && props.options.length > 0 && (
        <ListAssets assetType="Options" assets={props.options} />
      )}
      {props.stocks && props.stocks.length > 0 && (
        <ListAssets assetType="Stocks" assets={props.stocks} />
      )}
      {props.cryptocurrencies && props.cryptocurrencies.length > 0 && (
        <ListAssets
          assetType="Cryptocurrencies"
          assets={props.cryptocurrencies}
        />
      )}
      {props.watchlist && props.watchlist.length > 0 && (
        <ListAssets assetType="Watch List" assets={props.watchlist} />
      )}
    </Box>
  );
};

const renderAssetInfo = (asset: PositionInfo, index: number) => {
  const { name, price, percentChange, quantity } = asset;
  const color = percentChange > 0 ? green : red;
  const sign = percentChange > 0 ? "+" : "";
  return (
    <React.Fragment key={index}>
      <ListItem
        sx={{
          display: "flex",
          justifyContent: "space-between",
          paddingLeft: 3,
          paddingRight: 3,
        }}
        button
      >
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <Typography
            sx={{ fontWeight: "bold" }}
            component="span"
            variant="body2"
          >
            {name}
          </Typography>
          <Typography component="span" variant="body2">
            {quantity}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <Typography component="span" variant="body2">
            ${commifyLargeNumber(price)}
          </Typography>
          <Typography sx={{ color: color }} component="span" variant="body2">
            {sign}
            {percentChange}%
          </Typography>
        </Box>
      </ListItem>
    </React.Fragment>
  );
};

function ListAssets(props: IListAssets) {
  return (
    <List
      sx={{
        bgcolor: "#181818",
        minWidth: "250px",
        p: 0,
      }}
    >
      <Divider />
      <ListItem>
        <ListItemText>
          <Typography
            sx={{ fontWeight: "bold", paddingLeft: 1 }}
            component="span"
            variant="body2"
          >
            {props.assetType}
          </Typography>
        </ListItemText>
      </ListItem>
      <Divider />
      {props.assets.map(renderAssetInfo)}
    </List>
  );
}

export default ListAllAssets;
