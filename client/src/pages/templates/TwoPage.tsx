import { Box, Container, Grid } from "@mui/material/";
import { useAtom } from "jotai";
import React from "react";
import Banner, { bannerAtom } from "../../components/Banner";
import Header from "../../components/Header";

type Props = {
  lhs: React.ReactNode;
  rhs: React.ReactNode;
  navbar?: boolean;
  gridSpacing?: [number, number];
};

const defaultProps = {
  navbar: true,
};

const TwoPageTemplate = (props: Props) => {
  const [banner, setBanner] = useAtom(bannerAtom);
  const handleClose = () => {
    setBanner({ message: "", severity: "error" });
  };
  let spacing = [7, 5];
  if (props.gridSpacing) {
    spacing = props.gridSpacing;
  }
  return (
    <Box>
      {props.navbar && <Header />}
      <Banner banner={banner} handleClose={handleClose} />
      <Container maxWidth="lg">
        <Grid container spacing={2}>
          <Grid item xs={12} md={spacing[0]}>
            {props.lhs}
          </Grid>
          <Grid item xs={12} md={spacing[1]}>
            {props.rhs}
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

TwoPageTemplate.defaultProps = defaultProps;

export default TwoPageTemplate;
