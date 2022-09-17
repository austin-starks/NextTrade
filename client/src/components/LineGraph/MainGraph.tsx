import { Tab, Tabs, Typography } from "@mui/material/";
import React, { useEffect } from "react";
import { DateGraphEnum, timestamp } from "../../services/outsideInterfaces";
import { commifyLargeNumber, lightgrey } from "../../utils";
import PageTitle from "../Typography/PageTitle";
import BaseGraph, { LINE_GRAPH_STYLE } from "./BaseGraph";

export type MainGraphProps = {
  data: timestamp[];
  value: number;
  tabValues?: DateGraphEnum[];
  handleTabChange?: (newValue: DateGraphEnum) => void;
  onlyShowDateOnVerticalLine: boolean;
  title?: string;
};

function MainGraph(props: MainGraphProps) {
  const { data, value, tabValues } = props;
  const [tabValue, setTabValue] = React.useState<DateGraphEnum>(
    tabValues ? tabValues[0] : DateGraphEnum.TWO_DAYS
  );
  const [displayValue, setDisplayValue] = React.useState(0);
  const [hover, setHover] = React.useState(false);

  useEffect(() => {
    if (!hover) {
      setDisplayValue(value);
    }
  }, [hover, value]);

  const handleTabChange = (
    _event: React.SyntheticEvent,
    newValue: DateGraphEnum
  ) => {
    if (props.handleTabChange) {
      props.handleTabChange(newValue);
    }
    setTabValue(newValue);
  };

  const graphData = data;
  const drawVerticalLine = (chart: {
    tooltip?: any;
    scales?: any;
    ctx?: any;
  }) => {
    if (chart.tooltip._active && chart.tooltip._active.length) {
      // find coordinates of tooltip
      setHover(true);
      const activePoint = chart.tooltip._active[0];
      const { ctx } = chart;
      const { x } = activePoint.element;
      const topY = chart.scales.y.top;
      const bottomY = chart.scales.y.bottom;
      // draw vertical line
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, topY);
      ctx.lineTo(x, bottomY);
      ctx.lineWidth = 1;
      ctx.strokeStyle = lightgrey;
      ctx.textAlign = "center";
      ctx.fillStyle = lightgrey;
      const dataset = (chart as any).data.labels;
      ctx.fillText(dataset[activePoint.index], x, topY);
      ctx.stroke();
      ctx.restore();
    } else {
      setHover(false);
    }
  };
  const xData = graphData.map((d) =>
    props.onlyShowDateOnVerticalLine
      ? new Date(d.time).toDateString()
      : new Date(d.time).toLocaleString()
  );
  const yData = graphData.map((d) => ({
    value: d.value,
    baseline: d.baseline,
  }));
  const initialValue = yData[0]?.value || value;
  const dollarChange = displayValue - initialValue;
  const percentChange = Math.round((10000 * dollarChange) / initialValue) / 100;
  const dollarChangeSign = dollarChange >= 0 ? "+ " : "- ";
  const plugins = [{ afterDraw: drawVerticalLine }] as any;
  const options = {
    onHover: (e: any) => {
      if (e.chart.tooltip._active && e.chart.tooltip._active.length) {
        const idx = e.chart.tooltip._active[0].index;
        if (idx && graphData && graphData[idx]) {
          setDisplayValue(graphData[idx].value);
        }
      }
    },
  };

  return (
    <React.Fragment>
      {props.title && <PageTitle title={props.title} />}
      <Typography sx={{ display: "block" }} component="span" variant="h4">
        ${commifyLargeNumber(displayValue)}
      </Typography>
      <Typography sx={{ display: "block" }} component="span" variant="body2">
        {dollarChangeSign} ${commifyLargeNumber(Math.abs(dollarChange))}
        {initialValue > 0 ? `(${percentChange}%)` : ""}
      </Typography>
      <BaseGraph
        xData={xData}
        yData={yData}
        style={LINE_GRAPH_STYLE}
        options={options}
        plugins={plugins}
      />
      {tabValues && tabValues.length > 0 && (
        <Tabs
          sx={{
            "& .MuiTabs-indicator": {
              backgroundColor: "#606060",
            },
          }}
          variant="fullWidth"
          value={tabValue}
          onChange={handleTabChange}
          aria-label="date range"
          textColor="inherit"
          centered
        >
          {tabValues.map((item, index) => {
            return (
              <Tab sx={{ minWidth: 0 }} key={index} label={item} value={item} />
            );
          })}
        </Tabs>
      )}
    </React.Fragment>
  );
}
export default MainGraph;
