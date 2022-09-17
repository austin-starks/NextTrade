import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  CircularProgress,
  Grid,
  LinearProgress,
  Typography,
} from "@mui/material";
import { useAtom } from "jotai";
import _ from "lodash";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { bannerAtom } from "../../components/Banner";
import Button from "../../components/Button";
import ConfirmationDialog from "../../components/Dialog/ConfirmationDialog";
import ItemList, { Item } from "../../components/ItemList";
import Modal from "../../components/Modal";
import {
  IFormControl,
  IStatistics,
  StatusEnum,
} from "../../services/outsideInterfaces";
import {
  cancelOptimization,
  catchErrorCallback,
  editOptimizer,
  editPortfolioFromMock,
  getOptimizerForm,
  getOptimizerResults,
  resumeOptimizer,
} from "../../services/requests";
import {
  FACT_LIST_CARD_STYLE,
  FACT_LIST_CARD_STYLE_NO_BORDER,
  FACT_LIST_CONTAINER_STYLE,
  hoverProps,
} from "../../styles";
import { darkgray, durationToString, getDuration, gray } from "../../utils";
import { AbstractCondition } from "../Condition/interface";
import { AbstractPortfolio } from "../Portfolios/interface";
import { default as TwoPageTemplate } from "../templates/TwoPage";
import { IOptimizer, OptimizerState, OptimizerSummary } from "./interface";
import OptimizerForm from "./OptimizerForm";

interface ViewOptimizerPageProps {
  currentPortfolio: AbstractPortfolio;
  optimizer: IOptimizer | OptimizerSummary;
  optimizers: OptimizerSummary[];
  setOptimizers: (optimizers: OptimizerSummary[]) => void;
  onBackClick: () => void;
}
interface ViewOptimizerStateProps {
  state: OptimizerState;
  currentPortfolio: AbstractPortfolio;
}

const pushConditions = (
  items: Item[],
  conditions: AbstractCondition[],
  newConditions: AbstractCondition[],
  side: "Buy" | "Sell"
) => {
  const appendCondition = (
    oldC: AbstractCondition,
    newC: AbstractCondition
  ) => {
    // append form field
    const formFields = oldC.form.fields
      .map((group, i) => {
        return group.fields.map((f, j) => {
          const subtitle = f.value.toString();
          const newSubtitle = newC.form.fields[i].fields[j].value.toString();
          return {
            itemKey: side + ` Condition ${i} ${f.label}` + Math.random(),
            title: f.label,
            subtitle: (
              <Box display="flex">
                {subtitle !== newSubtitle && (
                  <Typography
                    sx={{ textDecoration: "line-through" }}
                    variant="caption"
                  >
                    {subtitle}
                  </Typography>
                )}
                <Box mx={1}></Box>
                <Typography variant="caption">{newSubtitle}</Typography>
              </Box>
            ),
            metadata: null,
            style: FACT_LIST_CARD_STYLE_NO_BORDER,
          };
        });
      })
      .flat();
    items.push(...formFields);
    items.push({
      itemKey: "Blank Condition " + Math.random(),
      title: "",
      subtitle: ``,
      metadata: null,
      style: { borderBottom: "1px dashed" + gray, marginBottom: "5px" },
    });

    // append inner conditions
    if (newC.conditions && oldC.conditions) {
      for (let i = 0; i < newC.conditions.length; i++) {
        const cmp = newC.conditions[i];
        appendCondition(oldC.conditions[i], cmp);
      }
    }
  };
  conditions.forEach((c, i) => {
    appendCondition(c, newConditions[i]);
  });
};

const RenderStatePortfolio = (props: {
  currentPortfolio: AbstractPortfolio;
  statePortfolio: AbstractPortfolio;
}) => {
  const { currentPortfolio, statePortfolio } = props;
  const items: Item[] = [];
  const currentStategies = currentPortfolio?.strategies || [];
  const stateStategies = statePortfolio?.strategies || [];
  for (let i = 0; i < currentStategies.length; i++) {
    const strategy = currentStategies[i];
    const stateStrategy = stateStategies[i];

    if (
      strategy.buyingConditions.length > 0 ||
      strategy.sellingConditions.length > 0
    ) {
      items.push({
        itemKey: "Strategy Name" + Math.random(),
        title: <Typography fontWeight={"bold"}>{strategy.name}</Typography>,
        subtitle: ``,
        metadata: null,
        style: FACT_LIST_CARD_STYLE_NO_BORDER,
      });
    }

    if (strategy.buyingConditions.length > 0) {
      const oldBuyAmount = `${strategy.buyAmount.amount} ${strategy.buyAmount.type}`;
      const newBuyAmount = `${stateStrategy.buyAmount.amount} ${stateStrategy.buyAmount.type}`;
      items.push({
        itemKey: "Buy Amount" + i,
        title: "Buy Amount",
        subtitle: (
          <Box display="flex">
            {oldBuyAmount !== newBuyAmount && (
              <Typography
                sx={{ textDecoration: "line-through" }}
                variant="caption"
              >
                {oldBuyAmount}
              </Typography>
            )}
            <Box mx={1}></Box>
            <Typography variant="caption">{newBuyAmount}</Typography>
          </Box>
        ),
        metadata: null,
        style: FACT_LIST_CARD_STYLE_NO_BORDER,
      });
      pushConditions(
        items,
        strategy.buyingConditions,
        stateStrategy.buyingConditions,
        "Buy"
      );
    }
    if (strategy.sellingConditions.length > 0) {
      const oldSellAmount = `${strategy.sellAmount.amount} ${strategy.sellAmount.type}`;
      const newSellAmount = `${stateStrategy.sellAmount.amount} ${stateStrategy.sellAmount.type}`;
      items.push({
        itemKey: "Sell Amount" + i + Math.random(),
        title: "Sell Amount",
        subtitle: (
          <Box display="flex">
            {oldSellAmount !== newSellAmount && (
              <Typography
                sx={{ textDecoration: "line-through" }}
                variant="caption"
              >
                {oldSellAmount}
              </Typography>
            )}
            <Box mx={1}></Box>
            <Typography variant="caption">{newSellAmount}</Typography>
          </Box>
        ),
        metadata: null,
        style: FACT_LIST_CARD_STYLE_NO_BORDER,
      });
      pushConditions(
        items,
        strategy.sellingConditions,
        stateStrategy.sellingConditions,
        "Sell"
      );
    }
    items.push({
      itemKey: "Blank " + i,
      title: "",
      subtitle: ``,
      metadata: null,
      style: FACT_LIST_CARD_STYLE_NO_BORDER,
    });
  }

  return (
    <Box>
      <ItemList
        containerStyle={FACT_LIST_CONTAINER_STYLE}
        items={items}
        onCardClick={() => {}}
      />
    </Box>
  );
};

const DetailedOptimizationState = (props: {
  currentPortfolio: AbstractPortfolio;
  statePortfolio: AbstractPortfolio;
}) => {
  const { statePortfolio, currentPortfolio } = props;
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [, setBanner] = useAtom(bannerAtom);
  return (
    <Box>
      <Modal
        size="lg"
        open={open}
        handleClose={function (): void {
          setOpen(false);
        }}
      >
        <Box>
          <Typography variant="h5">View State</Typography>
          <RenderStatePortfolio
            currentPortfolio={currentPortfolio}
            statePortfolio={statePortfolio}
          />
          <Box mt={2} display="flex" justifyContent="space-around">
            <Button
              onClick={() => {
                editPortfolioFromMock(currentPortfolio._id, statePortfolio)
                  .then(() => {
                    window.location.reload();
                  })
                  .catch((err) => {
                    catchErrorCallback(err, navigate, setBanner);
                  });
              }}
              style={{ width: "110px", fontSize: "11px" }}
              variant="contained"
            >
              Edit
            </Button>
            {/* <Button
              variant="outlined"
              style={{ width: "110px", fontSize: "11px" }}
            >
              Create New
            </Button> */}
          </Box>
        </Box>
      </Modal>
      <Grid
        onClick={() => {
          setOpen(true);
        }}
        sx={{ ...hoverProps }}
        container
        display="flex"
        justifyContent={"space-around"}
        mt={2}
      >
        {statePortfolio.strategies?.map((strategy, idx) => {
          return (
            <Grid item xs={3} textAlign="start" key={idx}>
              <Box>
                <Typography variant="caption">{strategy.name}</Typography>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

const StatisticsCard = (props: { statistics?: IStatistics; title: string }) => {
  const { statistics, title } = props;
  return (
    <Box>
      <Typography fontWeight="bold" variant="caption">
        {title}
      </Typography>
      {statistics && (
        <>
          <Box display="flex" justifyContent={"space-between"}>
            <Typography variant="body2">Sortino: </Typography>
            <Typography variant="body2">
              {_.round(statistics.sortino, 4)}
            </Typography>
          </Box>
          <Box display="flex" justifyContent={"space-between"}>
            <Typography variant="body2">Sharpe: </Typography>
            <Typography variant="body2">
              {_.round(statistics.sharpe, 4)}
            </Typography>
          </Box>
          <Box display="flex" justifyContent={"space-between"}>
            <Typography variant="body2">Percent Change: </Typography>
            <Typography variant="body2">
              {_.round(statistics.percentChange, 3)}%
            </Typography>
          </Box>
          <Box display="flex" justifyContent={"space-between"}>
            <Typography variant="body2">Total Change: </Typography>
            <Typography variant="body2">
              ${_.round(statistics.totalChange, 2)}
            </Typography>
          </Box>
          <Box display="flex" justifyContent={"space-between"}>
            <Typography variant="body2">Max Drawdown: </Typography>
            <Typography variant="body2">
              ${_.round(statistics.maxDrawdown, 2)}
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );
};

const ViewOptimizerState = (props: ViewOptimizerStateProps) => {
  const { state } = props;
  const [expanded, setExpanded] = React.useState<number | false>(false);
  const handleChange =
    (panel: number) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpanded(isExpanded ? panel : false);
    };
  return (
    <Box>
      <Box mb={1}>
        <Typography variant="h5">Optimization State</Typography>
      </Box>
      {state.map((element, idx) => {
        return (
          <Box key={idx}>
            <Accordion
              expanded={expanded === idx + 1}
              onChange={handleChange(idx + 1)}
              sx={{
                backgroundColor: darkgray,
                border: "1px solid " + gray,
                color: "white",
              }}
            >
              <AccordionSummary
                sx={{
                  ":hover": {},
                }}
                expandIcon={<ExpandMoreIcon sx={{ color: "white" }} />}
                aria-controls="panel1bh-content"
                id="panel1bh-header"
              >
                <Typography>Optimization Vector {idx + 1}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <StatisticsCard
                  title="Training Fitness"
                  statistics={element.trainingFitness}
                />
                <Box my={1}></Box>
                <StatisticsCard
                  title="Validation Fitness"
                  statistics={element.validationFitness}
                />
                <DetailedOptimizationState
                  statePortfolio={element.portfolio}
                  currentPortfolio={props.currentPortfolio}
                />
              </AccordionDetails>
            </Accordion>
          </Box>
        );
      })}
    </Box>
  );
};

const RenderStatisticsHistory = (props: {
  history: IStatistics[];
  title: string;
  subtitle: string;
  status: StatusEnum;
  expanded: string | false;
  setExpanded: (expanded: string | false) => void;
}) => {
  const { history, title, subtitle } = props;
  const { expanded, setExpanded } = props;

  const handleChange =
    (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpanded(isExpanded ? panel : false);
    };

  return (
    <Box>
      <Accordion
        expanded={expanded === title}
        onChange={handleChange(title)}
        sx={{
          backgroundColor: darkgray,
          border: "1px solid " + gray,
          color: "white",
        }}
      >
        <AccordionSummary
          sx={{
            ":hover": {},
          }}
          expandIcon={<ExpandMoreIcon sx={{ color: "white" }} />}
          aria-controls="panel1bh-content"
          id="panel1bh-header"
        >
          <Typography>{title}</Typography>
          <Typography>{subtitle}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container>
            {[...history].reverse().map((statistics, index) => {
              return (
                <Grid
                  item
                  xs={12}
                  sm={6}
                  lg={4}
                  sx={{
                    border: "1px solid" + gray,
                    borderRadius: "10px",
                    paddingY: "10px",
                    paddingX: "20px",
                  }}
                  key={index}
                >
                  <StatisticsCard
                    title={"Generation " + (history.length - index - 1)}
                    statistics={statistics}
                  />
                </Grid>
              );
            })}
          </Grid>
        </AccordionDetails>
      </Accordion>{" "}
    </Box>
  );
};

const Optimizer = (props: {
  optimizer: IOptimizer;
  setOptimizer: (o: IOptimizer) => void;
}) => {
  const { optimizer, setOptimizer } = props;
  const [timer, setTimer] = useState<string>("Fetching...");
  const [modalOpen, setModalOpen] = React.useState<boolean>(false);
  const [, setBanner] = useAtom(bannerAtom);
  const navigate = useNavigate();

  const [optimizerForm, setOptimizerForm] = React.useState<{
    form: IFormControl;
  }>({
    form: { fields: [] },
  });

  useEffect(() => {
    getOptimizerForm(optimizer._id)
      .then((response) => {
        setOptimizerForm(() => {
          return { form: response.data.form };
        });
      })
      .catch((err) => {
        catchErrorCallback(err, navigate, setBanner);
      });
  }, [optimizer]);

  useEffect(() => {
    setTimer(
      durationToString(getDuration(optimizer.startTime, optimizer.finishTime))
    );
    if (
      optimizer.status === StatusEnum.RUNNING ||
      optimizer.status === StatusEnum.PENDING
    ) {
      const interval = setInterval(() => {
        setTimer(
          durationToString(
            getDuration(optimizer.startTime, optimizer.finishTime)
          )
        );
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [optimizer]);

  const validationWindowValue = `${new Date(
    optimizer.validationStartDate
  ).toLocaleDateString()} — ${new Date(
    optimizer.validationEndDate
  ).toLocaleDateString()}`;
  const trainingWindowValue = `${new Date(
    optimizer.trainingStartDate
  ).toLocaleDateString()} — ${new Date(
    optimizer.trainingEndDate
  ).toLocaleDateString()}`;

  const currentGeneration = `${optimizer.currentGeneration} / ${optimizer.numGenerations}`;
  const mutationProbability =
    (optimizer.mutationProbability * 100).toString() + "%";
  const items: Item[] = [
    {
      itemKey: "timeElapsed",
      title: "Time Elapsed:",
      subtitle: timer,
      metadata: null,
    },
    {
      itemKey: `Current Generation`,
      title: "Current Generation:",
      subtitle: currentGeneration,
      metadata: null,
    },
    {
      itemKey: "populationSize",
      title: "Population Size",
      subtitle: optimizer.populationSize.toString(),
      metadata: null,
    },
    {
      itemKey: "fitnessFunction",
      title: "Fitness Function",
      subtitle: optimizer.fitnessFunction,
      metadata: null,
    },
    {
      itemKey: "trainingValidationRatio",
      title: "Training / Validation Ratio",
      subtitle: (optimizer?.trainValidationRatio || "").toString(),
      metadata: null,
    },
    {
      itemKey: "trainingWindowLength",
      title: "Training Window Length",
      subtitle: `${
        optimizer.trainingWindowLength
          ? `${optimizer.trainingWindowLength.toString()} days`
          : "Full"
      }`,
      metadata: null,
    },
    {
      itemKey: "mutationProbability",
      title: "Mutation Probability",
      subtitle: mutationProbability,
      metadata: null,
    },
    {
      itemKey: `trainingWindow ${trainingWindowValue}`,
      title: "Training Window",
      subtitle: trainingWindowValue,
      metadata: null,
    },
    {
      itemKey: `Validation Window ${validationWindowValue}`,
      title: "Validation Window",
      subtitle: validationWindowValue,
      metadata: null,
    },
    {
      itemKey: `Generated Data Ratio ${optimizer?.generatedData?.ratio}`,
      title: "Generated Data Ratio",
      subtitle: optimizer?.generatedData?.ratio,
      metadata: null,
    },
    {
      itemKey: `Generated Data Mean DeviationValue ${optimizer?.generatedData?.meanDeviationValue}`,
      title: "Generated Data Mean DeviationValue",
      subtitle: optimizer?.generatedData?.meanDeviationValue,
      metadata: null,
    },
  ];
  const [expanded, setExpanded] = React.useState<string | false>(false);

  return (
    <Box>
      <Modal
        open={modalOpen}
        handleClose={function (): void {
          setModalOpen(!modalOpen);
        }}
      >
        <OptimizerForm
          optimizerForm={optimizerForm}
          setOptimizerForm={(form) => {
            setOptimizerForm(form);
          }}
          onUpdate={async (form) => {
            editOptimizer(optimizer._id, form)
              .then((response) => {
                setOptimizer(response.data.optimizer);
                setModalOpen(false);
              })
              .catch((err) => {
                catchErrorCallback(err, navigate, setBanner);
              });
          }}
        />
      </Modal>
      <Box
        sx={{ ...hoverProps }}
        alignItems="end"
        display="flex"
        justifyContent="space-between"
        onClick={() => {
          setModalOpen(true);
        }}
      >
        <Typography
          style={{ marginTop: "12px", marginLeft: "20px" }}
          textAlign={"start"}
          variant="h6"
        >
          Optimization Summary
        </Typography>
        <Typography
          style={{ marginTop: "12px", marginRight: "30px" }}
          textAlign={"start"}
          variant="caption"
        >
          Click to edit
        </Typography>
      </Box>
      <ItemList
        customCardStyle={FACT_LIST_CARD_STYLE}
        containerStyle={FACT_LIST_CONTAINER_STYLE}
        items={items}
        onCardClick={() => {}}
      />
      <RenderStatisticsHistory
        title="Training Performance History"
        subtitle={``}
        history={optimizer.trainingFitnessHistory}
        status={optimizer.status}
        expanded={expanded}
        setExpanded={setExpanded}
      />
      <RenderStatisticsHistory
        title="Validation Performance History"
        subtitle=""
        history={optimizer.validationFitnessHistory}
        status={optimizer.status}
        expanded={expanded}
        setExpanded={setExpanded}
      />
    </Box>
  );
};

const ViewOptimizer = (props: ViewOptimizerPageProps) => {
  const [optimizer, setOptimizer] = React.useState<
    IOptimizer | OptimizerSummary
  >(props.optimizer);

  const [, setBanner] = useAtom(bannerAtom);
  const navigate = useNavigate();

  useEffect(() => {
    if (!("state" in props.optimizer)) {
      getOptimizerResults(props.optimizer._id)
        .then((res) => {
          setOptimizer(res.data.optimizer);
        })
        .catch((err) => catchErrorCallback(err, navigate, setBanner));
    }
  }, [navigate, props.optimizer, setBanner]);

  useEffect(() => {
    if (
      optimizer.status === StatusEnum.RUNNING ||
      optimizer.status === StatusEnum.PENDING
    ) {
      const interval = setInterval(() => {
        getOptimizerResults(optimizer._id)
          .then((res) => {
            setOptimizer(res.data.optimizer);
          })
          .catch((err) => catchErrorCallback(err, navigate, setBanner));
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [navigate, optimizer, setBanner, optimizer.status]);

  useEffect(() => {
    const idx = props.optimizers.findIndex((o) => o._id === optimizer._id);
    if (idx !== -1) {
      const newOptimizers = [...props.optimizers];
      newOptimizers[idx] = optimizer;
      props.setOptimizers(newOptimizers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optimizer]);
  const [dialog, setDialog] = React.useState(false);
  const lhs = (
    <Box mt={2}>
      <ConfirmationDialog
        dialogOpen={dialog}
        setDialogOpen={setDialog}
        onConfirm={function (): void {
          cancelOptimization(optimizer._id)
            .then((res) => {
              setOptimizer(res.data.optimizer);
            })
            .catch((err) => {
              catchErrorCallback(err, navigate, setBanner);
            });
        }}
        title={"Are you sure you want to cancel this optimization?"}
      />
      <Box display={"flex"} justifyContent="space-between">
        <Box sx={{ ...hoverProps }} onClick={props.onBackClick}>
          <ArrowBackIcon />
        </Box>
        <Box sx={{ ...hoverProps }}>
          {[StatusEnum.PENDING, StatusEnum.RUNNING].includes(
            optimizer.status
          ) ? (
            <CircularProgress
              onClick={() => {
                setDialog(true);
              }}
              color="inherit"
            />
          ) : (
            <RefreshIcon
              onClick={() => {
                resumeOptimizer(optimizer._id)
                  .then((res) => {
                    setOptimizer((o) => ({ ...res.data.optimizer }));
                  })
                  .catch((err) => {
                    catchErrorCallback(err, navigate, setBanner);
                  });
              }}
            />
          )}
        </Box>
      </Box>
      <Box display="flex" justifyContent={"center"} alignItems="center">
        <Typography align="center" gutterBottom={true} variant={"h4"}>
          {optimizer.name}
        </Typography>
      </Box>
      <Box my={1}>
        {optimizer.status === StatusEnum.COMPLETE ? (
          <LinearProgress color="inherit" variant="determinate" value={100} />
        ) : optimizer.status === StatusEnum.ERROR ? (
          <LinearProgress color="error" variant="determinate" value={100} />
        ) : (
          <LinearProgress color="inherit" />
        )}
      </Box>
      <Box mb={2}>
        {!("state" in optimizer) ? (
          <CircularProgress />
        ) : (
          <Optimizer setOptimizer={setOptimizer} optimizer={optimizer as any} />
        )}
      </Box>
    </Box>
  );
  const rhs = (
    <Box m={2}>
      {!("state" in optimizer) ? (
        <CircularProgress />
      ) : (
        <ViewOptimizerState
          currentPortfolio={props.currentPortfolio}
          state={optimizer.state as unknown as OptimizerState}
        />
      )}
    </Box>
  );
  return <TwoPageTemplate lhs={lhs} rhs={rhs} />;
};

export default ViewOptimizer;
