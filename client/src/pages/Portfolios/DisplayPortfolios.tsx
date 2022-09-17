import { Button } from "@material-ui/core";
import { Box, Grid, Typography } from "@mui/material/";
import React, { useEffect } from "react";
import { NavigateFunction, useNavigate } from "react-router-dom";
import { getPortfolios } from "../../services/requests";
import { centeredContent, hoverProps } from "../../styles";
import OnePage from "../templates/OnePage";
import { AbstractPortfolio } from "./interface";

interface PortfoliosGridProps {
  portfolios: AbstractPortfolio[];
  navigate: NavigateFunction;
}

function Portfolios() {
  const [portfolios, setPortfolios] = React.useState<AbstractPortfolio[]>([]);
  useEffect(() => {
    getPortfolios().then((res) => {
      setPortfolios(res.data.portfolios);
    });
  }, []);
  let navigate = useNavigate();

  return (
    <OnePage>
      <React.Fragment>
        <Typography textAlign={"center"} variant="h5">
          Portfolios
        </Typography>
        <PortfoliosGrid navigate={navigate} portfolios={portfolios} />
        <Box display="flex" justifyContent="center">
          <Button
            onClick={() => {
              navigate("/portfolio/create");
            }}
            variant="contained"
            color="primary"
          >
            Create Portfolio
          </Button>
        </Box>
      </React.Fragment>
    </OnePage>
  );
}

const PortfoliosGrid = (props: PortfoliosGridProps) => {
  const { portfolios, navigate } = props;
  return (
    <Box>
      <Box sx={centeredContent}>
        {portfolios.length === 0 ? (
          <Typography textAlign={"center"}>
            No Portfolios Found. Click Create Portfolio to create a new
            portfolio
          </Typography>
        ) : (
          <Grid sx={{ margin: "0 auto" }} spacing={1} container>
            <Grid item xs>
              <Typography>Name</Typography>
            </Grid>
            <Grid item xs>
              <Typography>Buying Power Used</Typography>
            </Grid>
            <Grid item xs>
              <Typography>Total Performance</Typography>
            </Grid>
            <Grid item xs>
              <Typography>Max Drawdown</Typography>
            </Grid>
            <Grid item xs>
              <Typography>Created at</Typography>
            </Grid>
          </Grid>
        )}
        {portfolios.map((portfolio, i) => {
          return (
            <Grid
              spacing={1}
              container
              onClick={() => {
                navigate(`/portfolio/${portfolio._id}`);
              }}
              sx={{
                ...hoverProps,
                margin: "0 auto",
                marginTop: "10px",
                marginBottom: "10px",
              }}
              key={portfolio._id + i}
            >
              <Grid item xs>
                <Typography variant="body2">{portfolio.name}</Typography>
              </Grid>
              <Grid item xs>
                <Typography variant="body2">$7,089/$12,371</Typography>
              </Grid>
              <Grid item xs>
                <Box>
                  <Typography variant="body2">60%</Typography>
                </Box>
              </Grid>
              <Grid item xs>
                <Box>
                  <Typography variant="body2">6%</Typography>
                </Box>
              </Grid>
              <Grid item xs>
                <Typography variant="body2">{portfolio.createdAt}</Typography>
              </Grid>
            </Grid>
          );
        })}
      </Box>
    </Box>
  );
};

export default Portfolios;
