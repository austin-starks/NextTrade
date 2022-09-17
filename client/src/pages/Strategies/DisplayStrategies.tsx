import { Box, Grid, Typography } from "@mui/material";
import { useAtom } from "jotai";
import _ from "lodash";
import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { bannerAtom } from "../../components/Banner";
import Button from "../../components/Button";
import ConfirmationDialog from "../../components/Dialog/ConfirmationDialog";
import { DeploymentEnum } from "../../services/outsideInterfaces";
import {
  catchErrorCallback,
  deletePortfolioStrategy,
  getPortfolio,
  savePortfolioStrategies,
} from "../../services/requests";
import { centeredContent } from "../../styles";
import { AbstractPortfolio } from "../Portfolios/interface";
import OnePageTemplate from "../templates/OnePage";
import { IStrategy } from "./interface";
import NewStrategy, { emptyStrategy, StrategyForm } from "./NewStrategy";

interface DisplayStrategyProps {
  strategies: IStrategy[];
  onSubmit: (strategy: StrategyForm) => Promise<Error | null>;
  onDelete: (id: string) => void;
  onEdit: (strategy: StrategyForm) => void;
}

const DisplayStrategies = (props: DisplayStrategyProps) => {
  const { strategies, onSubmit, onDelete, onEdit } = props;

  return (
    <Grid container display="flex" justifyContent={"center"}>
      {strategies.map((strategy, i) => {
        return (
          <Grid key={strategy._id + i} mx={5} my={2} item xs={12} lg={5}>
            <NewStrategy
              initialValues={strategy}
              onSubmit={async (values: StrategyForm) => {
                if (onSubmit) {
                  return onSubmit(values);
                }
                return null;
              }}
              onEdit={onEdit}
              onDelete={onDelete}
            />{" "}
          </Grid>
        );
      })}
    </Grid>
  );
};

const PortfolioStrategy = () => {
  const param = useParams();
  const [portfolio, setPortfolio] = React.useState<AbstractPortfolio>({
    name: "",
    _id: "",
    userId: "",
    buyingPower: 0,
    initialValue: 0,
    positions: [],
    active: true,
    deployment: DeploymentEnum.PAPER,
  });

  const [isCreating, setIsCreating] = React.useState(false);

  const navigate = useNavigate();
  const [, setBanner] = useAtom(bannerAtom);
  const [dialog, setDialog] = React.useState(false);
  useEffect(() => {
    getPortfolio(param.portfolioId as string)
      .then((res) => setPortfolio(res.data.portfolio))
      .catch((err) => {
        catchErrorCallback(err, navigate, setBanner);
      });
  }, [setBanner, navigate, param]);
  return (
    <OnePageTemplate>
      <Box>
        <ConfirmationDialog
          dialogOpen={dialog}
          setDialogOpen={setDialog}
          onConfirm={function (): void {
            navigate(`/portfolio/${portfolio._id}`);
          }}
          title={"Are you sure you want to navigate away?"}
        />
        <Box
          sx={{ ...centeredContent, maxHeight: "70vh" }}
          textAlign={"center"}
        >
          <Typography variant="h5">Strategies for {portfolio.name}</Typography>
          <Box>
            <DisplayStrategies
              onSubmit={async (strategy) => {
                return savePortfolioStrategies(
                  portfolio._id,
                  strategy as IStrategy
                )
                  .then((res) => {
                    setPortfolio(res.data.portfolio);
                    setIsCreating(false);
                    return null;
                  })
                  .catch((err) => {
                    catchErrorCallback(err, navigate, setBanner);
                    return new Error("Error saving strategy");
                  });
              }}
              onEdit={() => {
                // setIsCreating(!isCreating);
              }}
              strategies={portfolio.strategies || []}
              onDelete={(strategyId) => {
                if (!strategyId) {
                  const copy = _.cloneDeep(portfolio);
                  copy.strategies = (copy?.strategies || []).filter(
                    (s) => s._id !== strategyId
                  );
                  setPortfolio(copy);
                  setIsCreating(false);
                  return;
                }
                deletePortfolioStrategy(portfolio._id, strategyId)
                  .then((res) => {
                    setPortfolio(res.data.portfolio);
                  })
                  .catch((err) => {
                    catchErrorCallback(err, navigate, setBanner);
                  });
              }}
            />
          </Box>
        </Box>
        <Box display="flex" justifyContent={"center"} mt={3}>
          <Button
            onClick={() => {
              setDialog(true);
            }}
            variant="contained"
          >
            Back
          </Button>
          <Box mx={5}></Box>
          <Button
            onClick={() => {
              if (isCreating) {
                setBanner({
                  severity: "error",
                  message:
                    "You must save the strategy before creating another one",
                });
                return;
              }
              const copy = _.cloneDeep(portfolio);
              const strategies = copy.strategies || [];
              copy.strategies = [emptyStrategy(), ...strategies];
              setPortfolio(copy);
              setIsCreating(true);
            }}
            variant="contained"
          >
            Create
          </Button>
        </Box>
      </Box>
    </OnePageTemplate>
  );
};

export default PortfolioStrategy;
