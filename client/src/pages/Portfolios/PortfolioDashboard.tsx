import { Box, CircularProgress, Typography } from "@mui/material/";
import { useAtom } from "jotai";
import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { bannerAtom } from "../../components/Banner";
import BaseDashboard from "../../components/Dashboard/BaseDashboard";
import Divider from "../../components/Divider";
import Modal from "../../components/Modal";
import PositionList from "../../components/PositionList";
import { WATCH_LIST } from "../../services/MockData";
import {
  IFormControl,
  StatusEnum,
  timestamp,
} from "../../services/outsideInterfaces";
import {
  catchErrorCallback,
  createBacktest,
  editPortfolio,
  getBacktest,
  getBacktests,
  getOptimizerForm,
  getOptimizers,
  getPortfolio,
  getPortfolioHistory,
} from "../../services/requests";
import { hoverProps } from "../../styles";
import { commifyLargeNumber, sleep } from "../../utils";
import NewBacktest from "../Backtests/BacktestBuilder";
import { IBacktest } from "../Backtests/interface";
import { IOptimizer, OptimizerSummary } from "../Optimization/interface";
import NewOptimizer from "../Optimization/New";
import ViewOptimizer from "../Optimization/View";
import { IStrategy } from "../Strategies/interface";
import { DeploymentForm } from "./DeploymentForm";
import {
  getBacktestState,
  getPortfolioValue,
  getPositionList,
  PortfolioPageState,
} from "./helper";
import { AbstractPortfolio } from "./interface";

const PortfolioDashboard = () => {
  const [modal, setModal] = React.useState<{
    open: boolean;
    content: "" | "optimization" | "backtest" | "editPortfolio";
    size?: "sm" | "lg";
  }>({ open: false, content: "" });
  const [, setBanner] = useAtom(bannerAtom);
  const [state, setState] = React.useState<PortfolioPageState>({
    history: [],
    value: 0,
    title: "",
    page: "portfolio",
  });
  const [backtests, setBacktests] = React.useState<IBacktest[]>([]);
  const [optimizer, setOptimizer] = React.useState<
    IOptimizer | OptimizerSummary | null
  >(null);
  const [optimizers, setOptimizers] = React.useState<OptimizerSummary[]>([]);
  const [currentPortfolio, setCurrentPortfolio] = React.useState<{
    portfolio?: AbstractPortfolio;
    history: timestamp[];
  }>({ history: [] });
  const param = useParams();
  const navigate = useNavigate();
  const [optimizerForm, setOptimizerForm] = React.useState<{
    form: IFormControl;
  }>({
    form: { fields: [] },
  });

  useEffect(() => {
    getOptimizerForm()
      .then((response) => {
        setOptimizerForm(() => {
          return { form: response.data.form };
        });
      })
      .catch((err) => {
        catchErrorCallback(err, navigate, setBanner);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, param.portfolioId, setBanner]);

  useEffect(() => {
    getBacktests(param.portfolioId)
      .then((res) => {
        setBacktests(res.data.backtests);
      })
      .catch((err) => {
        catchErrorCallback(err, navigate, setBanner);
      });
  }, [navigate, setBanner, param.portfolioId]);

  useEffect(() => {
    getPortfolio(param.portfolioId as string)
      .then((response) => {
        const portfolio = response.data.portfolio;
        setCurrentPortfolio((p) => ({
          ...p,
          portfolio,
        }));
        setState((prevState) => {
          if (!(prevState.page === "portfolio")) {
            return { ...prevState };
          }
          return {
            page: "portfolio",
            history: prevState.history,
            value: getPortfolioValue(portfolio),
            title: portfolio.name,
            portfolio,
          };
        });
      })
      .catch((err) => {
        catchErrorCallback(err, navigate, setBanner);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, param.portfolioId, setBanner]);

  useEffect(() => {
    getPortfolioHistory(param.portfolioId as string)
      .then((response) => {
        const history = response.data.history;
        setState((prevState) => ({ ...prevState, history }));
        setCurrentPortfolio((p) => ({ ...p, history }));
      })
      .catch((err) => {
        catchErrorCallback(err, navigate, setBanner);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, param.portfolioId, setBanner]);

  useEffect(() => {
    getOptimizers(param.portfolioId || "main")
      .then((res) => {
        setOptimizers(res.data.optimizers);
      })
      .catch((err) => {
        catchErrorCallback(err, navigate, setBanner);
      });
  }, [navigate, param.portfolioId, setBanner]);

  useEffect(() => {
    const hasOptimizerRunning = optimizers.some((o) =>
      [StatusEnum.RUNNING, StatusEnum.PENDING].includes(o.status)
    );
    if (hasOptimizerRunning) {
      const interval = setInterval(() => {
        getOptimizers(param.portfolioId || "main")
          .then((res) => {
            setOptimizers(res.data.optimizers);
          })
          .catch((err) => {
            catchErrorCallback(err, navigate, setBanner);
          });
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [navigate, optimizers, param.portfolioId, setBanner]);

  if (state.page === "optimize") {
    if (optimizer === null || !state.portfolio) {
      return (
        <Box>
          <CircularProgress color="inherit" />
        </Box>
      );
    }
    return (
      <ViewOptimizer
        currentPortfolio={state.portfolio}
        optimizers={optimizers}
        setOptimizers={setOptimizers}
        onBackClick={() => {
          setState((s) => {
            const result = { ...s };
            result.page = "portfolio";
            return result;
          });
        }}
        optimizer={optimizer}
      />
    );
  }

  const createBacktestModalContent = (
    <NewBacktest
      backtests={backtests}
      onCardClick={(item) => {
        setState({
          ...getBacktestState(item.metadata.backtest),
        });
        setModal({
          open: false,
          content: "",
        });
      }}
      onSubmit={async (values) => {
        if (!currentPortfolio?.portfolio?._id) {
          return;
        }
        try {
          const res = await createBacktest(
            currentPortfolio.portfolio._id,
            values
          );
          setModal({
            open: false,
            content: "",
          });
          let backtestResp = await getBacktest(res.data.backtestId);
          const newState = getBacktestState(backtestResp.data.backtest);
          setState({
            ...newState,
          });
          while (
            [StatusEnum.PENDING, StatusEnum.RUNNING].includes(
              backtestResp.data.backtest.status
            )
          ) {
            await sleep(500);
            backtestResp = await getBacktest(res.data.backtestId);
            setState({
              ...getBacktestState(backtestResp.data.backtest),
            });
          }
          const newBacktests = [backtestResp.data.backtest, ...backtests];
          if (newBacktests.length > 4) {
            newBacktests.pop();
          }
          setBacktests(newBacktests);
        } catch (err) {
          catchErrorCallback(err, navigate, setBanner);
        }
      }}
    />
  );

  const createOptimizerModalContent = (
    <NewOptimizer
      portfolio={currentPortfolio?.portfolio}
      optimizers={optimizers}
      setOptimizers={setOptimizers}
      optimizerForm={optimizerForm}
      onSubmit={(o) => {
        getOptimizerForm()
          .then((response) => {
            setOptimizerForm(() => {
              return { form: response.data.form };
            });
          })
          .catch((err) => {
            catchErrorCallback(err, navigate, setBanner);
          });
        setState((s) => {
          window.scrollTo(0, 0);
          const result = { ...s };
          result.page = "optimize";
          setOptimizer(o);
          return result;
        });
      }}
    />
  );

  const setDeploymentModalContent = (
    <DeploymentForm
      portfolio={state.portfolio}
      onSubmit={(values) => {
        const id = currentPortfolio?.portfolio?._id;
        if (!id) {
          return;
        }
        editPortfolio(id, values)
          .then((resp) => {
            setState((prevState) => ({
              ...prevState,
              portfolio: resp.data.portfolio,
              title: resp.data.portfolio.name,
            }));
            setModal({
              open: false,
              content: "",
            });
          })
          .catch((err) => {
            catchErrorCallback(err, navigate, setBanner);
          });
      }}
    />
  );

  const strategies: IStrategy[] = state?.portfolio?.strategies || [];

  const lhs = (
    <React.Fragment>
      <Modal
        size={modal.size}
        open={modal.open}
        handleClose={() => {
          setModal({
            open: false,
            content: "",
          });
        }}
      >
        {modal.content === "backtest" && createBacktestModalContent}
        {modal.content === "editPortfolio" && setDeploymentModalContent}
        {modal.content === "optimization" && createOptimizerModalContent}
      </Modal>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          paddingLeft: "10px",
          paddingRight: "10px",
        }}
      >
        <Typography
          sx={{ display: "block", fontWeight: "bold" }}
          component="span"
          variant="caption"
        >
          Cash
        </Typography>
        <Typography
          sx={{ display: "block", fontWeight: "bold" }}
          component="span"
          variant="caption"
          color="white"
        >
          $
          {state.portfolio
            ? commifyLargeNumber(state.portfolio.buyingPower)
            : "?"}
        </Typography>
      </Box>
      <Box
        mt={1}
        sx={{
          display: "flex",
          justifyContent: "space-between",
          paddingLeft: "10px",
          paddingRight: "10px",
        }}
      >
        <Typography
          sx={{ display: "block", fontWeight: "bold" }}
          component="span"
          variant="caption"
        >
          Commission Paid
        </Typography>
        <Typography
          sx={{ display: "block", fontWeight: "bold" }}
          component="span"
          variant="caption"
          color="white"
        >
          $
          {state?.portfolio?.commissionPaid
            ? commifyLargeNumber(state.portfolio.commissionPaid)
            : "0"}
        </Typography>
      </Box>
      <Box sx={{ paddingTop: "25px", paddingBottom: "15px" }}>
        <Divider />
      </Box>
      <Box sx={{ paddingLeft: "10px", paddingRight: "10px" }}>
        <Box display="flex" justifyContent={"space-between"} alignItems="end">
          <Typography sx={{ fontWeight: "bold" }} variant="caption">
            Strategies
          </Typography>
          <Typography
            sx={{ fontWeight: "bold", ...hoverProps }}
            onClick={() =>
              navigate(
                `/portfolio/${
                  currentPortfolio?.portfolio?._id || ""
                }/strategies`
              )
            }
            variant="caption"
          >
            Edit Strategies
          </Typography>
        </Box>
        {strategies.map((strategy, idx) => {
          return (
            <Box key={idx}>
              <Typography variant={"caption"}>{strategy.name}</Typography>
            </Box>
          );
        })}
      </Box>
      <Box sx={{ paddingTop: "15px", paddingBottom: "5px" }}>
        <Divider />
      </Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          paddingLeft: "10px",
          paddingRight: "10px",
          fontWeight: "bold",
        }}
      >
        <Typography
          mt={2}
          variant="caption"
          sx={{ ...hoverProps, fontWeight: "bold" }}
          onClick={() => {
            setModal({ open: true, content: "editPortfolio" });
          }}
        >
          Settings
        </Typography>
        <Typography
          mt={2}
          variant="caption"
          sx={{ ...hoverProps, fontWeight: "bold" }}
          onClick={() => {
            setModal({
              open: true,
              content: "backtest",
              size: "lg",
            });
          }}
        >
          Backtest
        </Typography>
        <Typography
          mt={2}
          variant="caption"
          sx={{ ...hoverProps, fontWeight: "bold" }}
          onClick={() => {
            setModal({
              open: true,
              content: "optimization",
              size: "lg",
            });
          }}
        >
          Optimizer
        </Typography>
      </Box>
    </React.Fragment>
  );
  const { options, stocks, cryptocurrencies } = getPositionList(
    state.portfolio
  );
  const rhs = (
    <PositionList
      options={options}
      stocks={stocks}
      cryptocurrencies={cryptocurrencies}
      watchlist={WATCH_LIST}
      height={680}
    />
  );
  return (
    <BaseDashboard
      title={state.title}
      history={state.history}
      endHistoryDate={state.endHistoryDate}
      graphDates={state.graphDates}
      value={state.value}
      lhs={lhs}
      rhs={rhs}
    />
  );
};

export default PortfolioDashboard;
