import SearchIcon from "@mui/icons-material/Search";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import InputBase from "@mui/material/InputBase";
import { alpha, styled } from "@mui/material/styles";
import React, { useRef } from "react";
import { search } from "../../services/requests";
import { hoverProps } from "../../styles";
import { darkgrey, useDetectOutsideClick } from "../../utils";

const Search = styled("div")(({ theme }) => ({
  position: "relative",
  borderRadius: theme.shape.borderRadius,
  marginRight: theme.spacing(2),
  marginLeft: theme.spacing(4),
  width: "730px",
  [theme.breakpoints.down("md")]: {
    marginLeft: theme.spacing(3),
    marginRight: theme.spacing(3),
    width: "100%",
  },
}));

const SearchIconWrapper = styled("div")(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: "100%",
  position: "absolute",
  pointerEvents: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 2,
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: "inherit",
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  width: "100%",
  "&:hover": {
    backgroundColor: darkgrey,
  },
  "& .MuiInputBase-input": {
    padding: theme.spacing(1, 1, 1, 0),
    // vertical padding + font size from searchIcon
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create("width"),
    width: "100%",
    [theme.breakpoints.up("md")]: {
      width: "20ch",
    },
  },
}));

interface IAbstractMenuOptions {
  redirectUrl: string;
  name: string;
}

interface IMenuAssetOptions extends IAbstractMenuOptions {
  symbol: string;
}

interface IRenderOptionProps {
  options?: IAbstractMenuOptions[];
  title: string;
  cb: (elt: any, i: number) => void;
}

interface IMenuProps {
  highlighted: string;
  setHighlighted: React.Dispatch<React.SetStateAction<any>>;
  portfolioOptions?: IAbstractMenuOptions[];
  strategyOptions?: IAbstractMenuOptions[];
  stockOptions?: IMenuAssetOptions[];
  cryptoOptions?: IMenuAssetOptions[];
  submit: () => void;
}

const Menu = (props: IMenuProps) => {
  const cbStyles = {
    paddingTop: "7px",
    paddingBottom: "7px",
    paddingLeft: "10px",
    paddingRight: "5px",
    fontSize: "14px",
  };
  const assetCb = (asset: IMenuAssetOptions, i: number) => (
    <Box
      sx={{
        "&:hover": hoverProps,
        ...cbStyles,
        backgroundColor:
          props.highlighted === asset.redirectUrl ? "#373737" : undefined,
      }}
      onMouseOver={() => props.setHighlighted(asset.redirectUrl)}
      onClick={() => props.submit()}
      key={asset.redirectUrl}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Box>
          {asset.symbol} ({asset.name})
        </Box>
      </Box>
    </Box>
  );

  const nonAssetCb = (asset: IMenuAssetOptions, i: number) => (
    <Box
      sx={{
        ...cbStyles,
        "&:hover": hoverProps,
        backgroundColor:
          props.highlighted === asset.redirectUrl ? "#373737" : undefined,
      }}
      onMouseOver={() => props.setHighlighted(asset.redirectUrl)}
      onClick={() => props.submit()}
      key={asset.redirectUrl}
    >
      <Box>
        <Box>{asset.name}</Box>
      </Box>
    </Box>
  );

  const optionLabelStyle = {
    paddingBottom: "3px",
    marginBottom: "4px",
    marginTop: "4px",
    color: "#999999",
    marginLeft: "10px",
  };

  const RenderOption = (props: IRenderOptionProps) => {
    if (!props.options || props.options.length === 0) return <Box></Box>;
    return (
      <Box>
        <Box sx={optionLabelStyle}>{props.title}</Box>
        {props.options.map(props.cb)}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        position: "absolute",
        bgcolor: darkgrey,
        width: "100%",
        top: 39,
        height: 250,
        overflowY: "scroll",
        zIndex: 1,
      }}
    >
      <Box sx={{ marginLeft: "30px", marginRight: "30px" }}>
        <Grid container spacing={2}>
          <Grid item xs>
            <RenderOption
              title={"Stocks"}
              options={props.stockOptions}
              cb={assetCb}
            />
            <Box sx={{ marginTop: "10px" }}></Box>
            <RenderOption
              title={"Cryptocurrency"}
              options={props.cryptoOptions}
              cb={assetCb}
            />
          </Grid>
          <Grid item xs>
            <RenderOption
              cb={nonAssetCb}
              title={"Portfolios"}
              options={props.portfolioOptions}
            />
            <Box sx={{ marginTop: "10px" }}></Box>
            <RenderOption
              title={"Strategies"}
              options={props.strategyOptions}
              cb={nonAssetCb}
            />
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

const Searchbar = () => {
  const [inputValue, setInputValue] = React.useState("");
  const [showMenu, setShowMenu] = React.useState(false);
  const [options, setOptions] = React.useState({
    portfolioOptions: [],
    strategyOptions: [],
    stockOptions: [],
    cryptoOptions: [],
  });
  const [highlighted, setHighlighted] = React.useState("");
  const wrapperRef = useRef(null);

  const clearMenu = () => {
    setShowMenu(false);
    setHighlighted("");
  };
  useDetectOutsideClick(wrapperRef, clearMenu);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (e.target.value !== "") {
      setShowMenu(true);
    } else {
      setShowMenu(false);
    }
    search(e.target.value).then((res) => {
      setOptions(res.data.options);
    });
  };

  const submit = () => {
    if (highlighted) {
      window.location.href = highlighted;
    }
  };

  return (
    <React.Fragment>
      <Search>
        <SearchIconWrapper>
          <SearchIcon />
        </SearchIconWrapper>
        <Box ref={wrapperRef}>
          <StyledInputBase
            placeholder="Search"
            sx={{
              backgroundColor: showMenu ? darkgrey : undefined,
            }}
            value={inputValue}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === "Enter") {
                submit();
              }
            }}
            onChange={onChange}
            onFocus={() => {
              if (inputValue) setShowMenu(true);
            }}
            inputProps={{ "aria-label": "search" }}
          />
          {showMenu && (
            <Menu
              highlighted={highlighted}
              setHighlighted={setHighlighted}
              stockOptions={options.stockOptions}
              cryptoOptions={options.cryptoOptions}
              portfolioOptions={options.portfolioOptions}
              strategyOptions={options.strategyOptions}
              submit={submit}
            />
          )}
        </Box>
      </Search>
    </React.Fragment>
  );
};

export default Searchbar;
