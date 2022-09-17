import { Link, Typography } from "@mui/material/";
import React from "react";

function Welcome() {
  return (
    <React.Fragment>
      <Typography variant="h4">Landing Page</Typography>
      <Typography variant="caption">
        Should be landing page if not signed in; else home page
      </Typography>
      <br />
      <Link href="/login" color="inherit">
        Login
      </Link>
      <br />
      <Link href="/signup" color="inherit">
        Register
      </Link>
      <br />
    </React.Fragment>
  );
}
export default Welcome;
