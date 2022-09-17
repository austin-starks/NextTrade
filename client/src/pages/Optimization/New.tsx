import { Box, Typography } from "@mui/material";
import { useAtom } from "jotai";
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { bannerAtom } from "../../components/Banner";
import DisplayFormGroup from "../../components/FormControl/DisplayFormGroup";
import ItemList, { Item } from "../../components/ItemList";
import { IFormControl } from "../../services/outsideInterfaces";
import {
  catchErrorCallback,
  getOptimizerForm,
  getOptimizers,
  optimize,
} from "../../services/requests";
import { AbstractPortfolio } from "../Portfolios/interface";
import TwoPageTemplate from "../templates/TwoPage";
import { IOptimizer, OptimizerSummary } from "./interface";
import OptimizerForm from "./OptimizerForm";
import { getChip } from "./shared";

export interface OptimizerForm {
  form: IFormControl;
}

interface NewOptimizerPageProps {
  optimizerForm: OptimizerForm;
  optimizers: OptimizerSummary[];
  setOptimizers: (optimizers: OptimizerSummary[]) => void;
  onSubmit: (optimizer: IOptimizer) => void;
  portfolio?: AbstractPortfolio;
}

const NewOptimizer = (props: NewOptimizerPageProps) => {
  const { portfolio, optimizers, setOptimizers } = props;
  const [optimizerForm, setOptimizerForm] = React.useState<{
    form: IFormControl;
  }>({
    form: { fields: [] },
  });
  const navigate = useNavigate();
  const [, setBanner] = useAtom(bannerAtom);

  useEffect(() => {
    setOptimizerForm(props.optimizerForm);
  }, [props.optimizerForm]);

  const items: Item[] = optimizers.map(
    (optimizer: OptimizerSummary, idx: number) => {
      const startDate = new Date(optimizer.startDate).toDateString();
      const endDate = new Date(optimizer.endDate).toDateString();
      return {
        itemKey: optimizer._id + idx + optimizer.status,
        title: (
          <Box display="flex" justifyContent={"center"}>
            <Box
              mb={1}
              display="flex"
              justifyContent={"space-between"}
              alignItems="end"
            >
              <Box sx={{ fontWeight: "bold", fontSize: "14px" }}>
                {optimizer.name}
              </Box>
              <Box mx={1}></Box>
              <Box>{getChip(optimizer.status, optimizer.error)}</Box>
            </Box>
          </Box>
        ),
        subtitle: (
          <Box display="flex" justifyContent="center">
            <Box sx={{ fontSize: "12px" }}>{`${startDate} - ${endDate}`}</Box>
          </Box>
        ),
        metadata: {
          optimizer: optimizer,
        },
      };
    }
  );

  const rhs = (
    <Box m={2}>
      <Typography align="center" gutterBottom={true} variant={"h6"}>
        Past Optimizers
      </Typography>
      <ItemList
        items={items}
        onCardClick={(item) => {
          props.onSubmit(item.metadata.optimizer);
        }}
      />
    </Box>
  );

  const lhs = (
    <OptimizerForm
      optimizerForm={optimizerForm}
      setOptimizerForm={(form) => {
        setOptimizerForm(form);
      }}
      onUpdate={async (object: { form: IFormControl }) => {
        try {
          if (!portfolio) {
            return;
          }
          const res = await optimize(portfolio._id, object);
          const optimizer: IOptimizer = res.data.optimizer;
          props.onSubmit(optimizer);
          getOptimizerForm()
            .then((response) => {
              setOptimizerForm({ form: response.data.form });
            })
            .catch((err) => {
              catchErrorCallback(err, navigate, setBanner);
            });
          getOptimizers(optimizer.portfolioId)
            .then((res) => {
              setOptimizers(res.data.optimizers);
            })
            .catch((err) => {
              catchErrorCallback(err, navigate, setBanner);
            });
        } catch (e: any) {
          if (e.response.data.form) {
            setOptimizerForm({ form: e.response.data.form });
          } else {
            catchErrorCallback(e, navigate, setBanner);
          }
        }
      }}
    />
  );
  return <TwoPageTemplate navbar={false} lhs={lhs} rhs={rhs} />;
};

export default NewOptimizer;
