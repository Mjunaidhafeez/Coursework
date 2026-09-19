import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import { Button, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import ListingPage from "../../components/shared/ListingPage";
import { useUi } from "../../context/UiContext";

const TranscriptPage = () => {
  const { notify } = useUi();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(ENDPOINTS.campusTranscript)
      .then((res) => setData(res.data))
      .catch(() => notify("Could not load transcript", "error"));
  }, []);

  const printSheet = async () => {
    try {
      const res = await api.get(`${ENDPOINTS.campusTranscript}?format=html`, { responseType: "text" });
      const win = window.open("", "_blank");
      win.document.write(res.data);
      win.document.close();
      win.focus();
      win.print();
    } catch {
      notify("Could not open printable marksheet", "error");
    }
  };

  return (
    <ListingPage
      title="Transcript"
      icon={<DescriptionRoundedIcon />}
      subtitle="Marks compiled from graded submissions. Print a marksheet anytime."
      actions={<Button variant="contained" onClick={printSheet}>Print marksheet</Button>}
    >
      {!data ? <Typography color="text.secondary">Loading…</Typography> : (
        <Stack spacing={1}>
          <Typography sx={{ fontWeight: 800 }}>{data.student} ({data.username})</Typography>
          <Typography variant="body2" color="text.secondary">Total {data.obtained} / {data.total} ({data.percent}%)</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Course</TableCell>
                <TableCell>Assessment</TableCell>
                <TableCell>Marks</TableCell>
                <TableCell>Max</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data.rows || []).map((row, index) => (
                <TableRow key={`${row.course}-${index}`}>
                  <TableCell>{row.course}</TableCell>
                  <TableCell>{row.assessment}</TableCell>
                  <TableCell>{row.marks}</TableCell>
                  <TableCell>{row.max_marks}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Stack>
      )}
    </ListingPage>
  );
};

export default TranscriptPage;
