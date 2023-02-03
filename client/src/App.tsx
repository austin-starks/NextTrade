import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import Cookies from "js-cookie";
import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AssetDashboard from "./pages/Assets/AssetDashboard";
import Login from "./pages/Authentication/Login";
import Register from "./pages/Authentication/Register";
import Portfolios from "./pages/Portfolios/DisplayPortfolios";
import NewPortfolio from "./pages/Portfolios/NewPortfolio";
import PortfolioDashboard from "./pages/Portfolios/PortfolioDashboard";
import Profile from "./pages/Profile";
import PortfolioStrategy from "./pages/Strategies/DisplayStrategies";

type AuthProps = {
  Component: React.ComponentType<any>;
};

function Authenticated(props: AuthProps) {
  const { Component } = props;
  if (!Cookies.get("jwt")) {
    return <Navigate replace to="/login" />;
  }
  return <Component {...props} />;
}

function NotAuthenticated(props: AuthProps) {
  const { Component } = props;
  if (Cookies.get("jwt")) {
    return <Navigate replace to="/portfolio" />;
  }
  return <Component {...props} />;
}

function App() {
  return (
    <React.Fragment>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={<Authenticated Component={PortfolioDashboard} />}
            />
            <Route
              path="/login"
              element={<NotAuthenticated Component={Login} />}
            />
            <Route
              path="/register"
              element={<NotAuthenticated Component={Register} />}
            />
            <Route
              path="/signup"
              element={<NotAuthenticated Component={Register} />}
            />
            <Route
              path="/portfolio"
              element={<Authenticated Component={Portfolios} />}
            />
            <Route
              path="/portfolio/create"
              element={<Authenticated Component={NewPortfolio} />}
            />
            <Route
              path="/portfolio/:portfolioId"
              element={<Authenticated Component={PortfolioDashboard} />}
            />
            <Route
              path="/portfolio/:portfolioId/strategies"
              element={<Authenticated Component={PortfolioStrategy} />}
            />
            <Route
              path="/profile"
              element={<Authenticated Component={Profile} />}
            />
            <Route
              path="/stock/:symbol"
              element={<Authenticated Component={AssetDashboard} />}
            />
            <Route
              path="/crypto/:symbol"
              element={<Authenticated Component={AssetDashboard} />}
            />
            <Route
              path="/option/:symbol"
              element={<Authenticated Component={AssetDashboard} />}
            />
          </Routes>
        </BrowserRouter>
      </LocalizationProvider>
    </React.Fragment>
  );
}
export default App;
