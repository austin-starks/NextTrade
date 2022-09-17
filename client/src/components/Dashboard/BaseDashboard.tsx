import { Box } from "@mui/material/";
import React, { useEffect, useState } from "react";
import TwoPage from "../../pages/templates/TwoPage";
import { DateGraphEnum, timestamp } from "../../services/outsideInterfaces";
import { filterHistory } from "../../utils";
import Divider from "../Divider";
import { MainGraph } from "../LineGraph";

interface Props {
  title: string;
  lhs: React.ReactNode;
  rhs: React.ReactNode;
  value: number;
  history: timestamp[];
  endHistoryDate?: Date;
  graphDates?: DateGraphEnum[];
}

function BaseDashboard(props: Props) {
  const [dates, setDates] = useState([
    DateGraphEnum.TWO_DAYS,
    DateGraphEnum.WEEK,
    DateGraphEnum.MONTH,
    DateGraphEnum.THREE_MONTHS,
    DateGraphEnum.YEAR,
    DateGraphEnum.TWO_YEARS,
    DateGraphEnum.ALL,
  ]);
  const [value, setValue] = useState<number>(0);
  const [tab, setTab] = useState<DateGraphEnum>(dates[0]);
  const [displayedGraphData, setDisplayedGraphData] = useState<timestamp[]>([]);

  useEffect(() => {
    if (!props.graphDates) {
      return;
    }
    setDates(props.graphDates);
  }, [props.graphDates]);

  useEffect(() => {
    setValue(props.value);
  }, [props.value]);

  useEffect(() => {
    setDisplayedGraphData(
      filterHistory(props.history, tab, props.endHistoryDate || new Date())
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.history, tab]);

  const graph = (
    <React.Fragment>
      <MainGraph
        data={displayedGraphData}
        value={value}
        tabValues={dates}
        handleTabChange={(newValue: DateGraphEnum) => {
          setTab(newValue);
        }}
        title={props.title}
        onlyShowDateOnVerticalLine={dates.indexOf(tab) > 1}
      />
      <Box sx={{ paddingBottom: "25px" }}>
        <Divider />
      </Box>
    </React.Fragment>
  );

  const lhs = (
    <React.Fragment>
      {graph}
      {props.lhs}
    </React.Fragment>
  );

  return <TwoPage {...props} lhs={lhs} rhs={props.rhs} />;
}
export default BaseDashboard;
