import React from "react";
import { Line } from "react-chartjs-2";

export const LINE_GRAPH_STYLE = {
  minWidth: "475px",
  width: "100%",
  marginBottom: "20px",
  paddingRight: "50px",
};

export interface LineGraphProps {
  style?: any;
  options?: any;
  plugins?: any[];
  xData: string[];
  yData: { value: number; baseline?: number }[];
}

export const sharedOptions = {
  maintainAspectRatio: true,
  legend: { display: false },
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      enabled: false,
    },
  },
  interaction: {
    mode: "index" as "index",
    intersect: false,
  },
  hover: {
    mode: "index" as "index",
    intersect: false,
  },
};

const LineGraph: React.FunctionComponent<LineGraphProps> = (props) => {
  const { style, xData, yData, options, plugins } = props;
  const fullOptions = {
    ...options,
    ...sharedOptions,
    scales: {
      x: {
        grid: { display: false, drawBorder: false },
        ticks: {
          display: false,
        },
      },
      y: {
        grid: { display: false, drawBorder: false },
        ticks: {
          display: yData.length && yData[0].baseline ? true : false,
        },
      },
    },
  };

  const color =
    yData.length === 0 || yData[yData.length - 1].value - yData[0].value === 0
      ? "grey"
      : yData[yData.length - 1].value - yData[0].value > 0
      ? "#5AC53B"
      : "red";
  const baselineDataset =
    yData.length && yData[0].baseline
      ? [
          {
            data: yData.map((d) => d.baseline),
            backgroundColor: "transparent",
            borderColor: "grey",
            borderWidth: 2,
            label: `graph-${1}`,
            pointBorderColor: "rgba(0, 0, 0, 0)",
            pointBackgroundColor: "rgba(0, 0, 0, 0)",
            pointHoverBackgroundColor: "grey",
            pointHoverBorderColor: "#000000",
            pointHoverBorderWidth: 1,
            pointHoverRadius: 1,
            yAxisID: `y`,
            type: "line" as "line",
          },
        ]
      : [];

  return (
    <div style={style}>
      <Line
        data={{
          labels: xData,
          datasets: [
            {
              data: yData.map((d) => d.value),
              backgroundColor: "transparent",
              borderColor: color,
              borderWidth: 2,
              label: "Portfolio Value",
              pointBorderColor: "rgba(0, 0, 0, 0)",
              pointBackgroundColor: "rgba(0, 0, 0, 0)",
              pointHoverBackgroundColor: color,
              pointHoverBorderColor: "#000000",
              pointHoverBorderWidth: 1,
              pointHoverRadius: 6,
              type: "line",
              yAxisID: "y",
            },
            ...baselineDataset,
          ],
        }}
        options={fullOptions}
        plugins={plugins}
      />
    </div>
  );
};

export default LineGraph;
