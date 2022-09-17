import { Box, Typography } from "@material-ui/core/";

interface Props {
  title: string;
}

const PageTitle = (props: Props) => {
  return (
    <Box sx={{ textAlign: "center", marginBottom: "3%" }}>
      <Typography component="span" variant="h5">
        {props.title}
      </Typography>
    </Box>
  );
};

export default PageTitle;
