import { Container, Grid } from "@mui/material/";
import { useAtom } from "jotai";
import { ReactChild, ReactChildren } from "react";
import Banner, { bannerAtom } from "../../components/Banner";
import Header from "../../components/Header";

type Props = {
  children?: ReactChild | ReactChildren;
  navbar?: boolean;
};

const defaultProps = {
  navbar: true,
};

const OnePageTemplate = (props: Props) => {
  const [banner, setBanner] = useAtom(bannerAtom);
  const handleClose = () => {
    setBanner({ message: "", severity: "error" });
  };
  return (
    <Grid>
      <Banner banner={banner} handleClose={handleClose} />
      {props.navbar && <Header />}
      <Container maxWidth="lg">{props.children}</Container>
    </Grid>
  );
};

OnePageTemplate.defaultProps = defaultProps;

export default OnePageTemplate;
