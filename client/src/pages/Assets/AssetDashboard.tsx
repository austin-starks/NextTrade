import { Box } from "@mui/material";
import { useAtom } from "jotai";
import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { bannerAtom } from "../../components/Banner";
import Card from "../../components/Card";
import DenseTable from "../../components/Table";
import { timestamp } from "../../services/outsideInterfaces";
import {
  catchErrorCallback,
  getAssetHistory,
  getStockData,
} from "../../services/requests";
import { commifyLargeNumber } from "../../utils";
import BaseDashboard from "../../components/Dashboard/BaseDashboard";

function createData(
  strategyName: string,
  time: string,
  amount: number,
  profit: string
) {
  return [strategyName, time, `$${commifyLargeNumber(amount)}`, profit];
}

const rows = [
  createData("Buy COIN at dip", new Date().toLocaleString(), 1056, "----"),
  createData("Buy COIN at dip", new Date().toLocaleString(), 5432, "----"),
  createData(
    "COIN options on flash-crash",
    new Date().toLocaleString(),
    8342.09,
    "+$1,676.09"
  ),
  createData(
    "COIN options on flash-crash",
    new Date().toLocaleString(),
    1254.21,
    "-$672.00"
  ),
];

const LandingDashboard = () => {
  const [value, setValue] = React.useState(0);
  const [history, setHistory] = React.useState<timestamp[]>([]);
  const [, setBanner] = useAtom(bannerAtom);
  const navigate = useNavigate();
  const location = useLocation();
  const regex = /(\w+)\/(\w+)/;
  const match = location.pathname.match(regex) as RegExpMatchArray;
  const stock = match[2].toUpperCase();
  const type = match[1].toLowerCase();
  useEffect(() => {
    getStockData(stock)
      .then((res) => {
        setValue(res.data.value);
      })
      .catch((err) => {
        catchErrorCallback(err, navigate, setBanner);
      });
  }, [navigate, setBanner, stock]);

  useEffect(() => {
    getAssetHistory(stock, "stock")
      .then((res) => {
        setHistory(res.data.history);
      })
      .catch((err) => {
        catchErrorCallback(err, navigate, setBanner);
      });
  }, [navigate, setBanner, stock]);

  const lhs = (
    <React.Fragment>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Card
          title="Your Equity"
          subtitle="$4,129.65"
          lines={[
            ["Today's P/L:", "$2,145.65 (+2.5%)"],
            ["Quantity:", "23.65 shares"],
            ["Avg Cost:", "$167.87"],
          ]}
        />
        <Card
          title="Performance Evaluation"
          subtitle="EXCELLENT"
          lines={[
            ["All-Time P/L:", "$23,145.65 (+2.5%)"],
            ["Portfolio Diversity:", "52.5%"],
            ["Overall Ranking:", "1"],
          ]}
        />
      </Box>
    </React.Fragment>
  );
  const rhs = (
    <DenseTable
      rows={rows}
      labels={["Strategy Name", "Time", "Amount", "Profit"]}
    />
  );
  return (
    <BaseDashboard
      title={`${stock} ${type}`}
      history={history}
      value={value}
      lhs={lhs}
      rhs={rhs}
    />
  );
};

export default LandingDashboard;
