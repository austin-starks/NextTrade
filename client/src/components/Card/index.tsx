import { alpha, Box, Typography } from "@mui/material";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import React from "react";
import { grey } from "../../utils";
import Divider from "../Divider";

interface ICustomCard {
  title: string;
  subtitle: string;
  lines: [string, string][];
}

interface ILineItem {
  line?: [string, string];
}

const CustomCard = (props: ICustomCard) => {
  const LineItem = (props: ILineItem) => {
    const { line } = props;
    return (
      <React.Fragment>
        <Box
          sx={{
            display: "flex",
            marginBottom: "10px",
            marginTop: "10px",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="body2">{line && line[0]}</Typography>
          <Typography variant="body2">{line && line[1]}</Typography>
        </Box>
        <Divider />
      </React.Fragment>
    );
  };
  return (
    <Card
      sx={{
        width: "45%",
        backgroundColor: "transparent",
        color: "white",
        border: "0.5px solid " + alpha(grey, 0.25),
      }}
    >
      <CardContent>
        <Typography sx={{ fontSize: 12 }} gutterBottom>
          {props.title}
        </Typography>
        <Typography marginBottom={1} variant="h6" component="div">
          {props.subtitle}
        </Typography>
        <Divider />
        {props.lines.map((line, index) => (
          <LineItem key={index} line={line} />
        ))}
      </CardContent>
    </Card>
  );
};

export default CustomCard;
