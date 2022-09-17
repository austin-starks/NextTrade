import { CssBaseline } from "@material-ui/core";
import { ThemeOptions } from "@material-ui/core/";
import { createTheme, MuiThemeProvider } from "@material-ui/core/styles";
import React from "react";
import ReactDOM from "react-dom";
import App from "./App";

const themeOptions: ThemeOptions = {
  palette: {
    type: "dark",
    background: {
      default: "#000000",
    },
    primary: {
      main: "#ffffff",
    },
    secondary: {
      main: "#3a3b3c",
    },
  },
};
const theme = createTheme(themeOptions);

ReactDOM.render(
  <React.StrictMode>
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </MuiThemeProvider>
  </React.StrictMode>,
  document.getElementById("root")
);
