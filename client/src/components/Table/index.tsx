import { alpha } from "@material-ui/core/styles";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { grey } from "../../utils";

interface TableProps {
  rows: string[][];
  labels: string[];
}

export default function DenseTable(props: TableProps) {
  const { rows, labels } = props;
  return (
    <TableContainer sx={{ backgroundColor: "transparent" }} component={Paper}>
      <Table
        sx={{
          "& .MuiTableCell-root": {
            borderBottom: "0.5px solid " + alpha(grey, 0.5),
          },
        }}
        size="medium"
        aria-label="transaction history"
      >
        <TableHead>
          <TableRow
            sx={{
              "& th": {
                color: "white",
              },
            }}
          >
            {labels.map((label, index) => (
              <TableCell key={index}>{label}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, idx) => (
            <TableRow
              key={idx}
              sx={{
                "& th": {
                  color: "white",
                },
                "& td": {
                  color: "white",
                },
              }}
            >
              {row.map((cell, index) => (
                <TableCell key={index}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
