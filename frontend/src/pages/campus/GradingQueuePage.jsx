import AssignmentLateRoundedIcon from "@mui/icons-material/AssignmentLateRounded";
import { Button, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import ListingPage from "../../components/shared/ListingPage";
import { useUi } from "../../context/UiContext";
import { listRows } from "./listRows";

const GradingQueuePage = () => {
  const { notify } = useUi();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get(`${ENDPOINTS.submissions}?workflow_state=file_submitted&page_size=50`)
      .then((res) => setRows(listRows(res.data)))
      .catch(() => notify("Could not load queue", "error"));
  }, []);

  return (
    <ListingPage title="Grading queue" icon={<AssignmentLateRoundedIcon />} subtitle="Unmarked files waiting this week">
      <Stack spacing={0.8}>
        {rows.map((item) => (
          <Stack key={item.id} direction={{ xs: "column", sm: "row" }} justifyContent="space-between" sx={{ p: 1, border: "1px solid #e2e8f0", borderRadius: 1.5 }}>
            <div>
              <Typography sx={{ fontWeight: 800 }}>{item.coursework_title || item.student_name || "Submission"}</Typography>
              <Typography variant="caption" color="text.secondary">{item.student_name} · {item.submitted_at ? new Date(item.submitted_at).toLocaleString() : "Waiting"}</Typography>
            </div>
            <Button size="small" onClick={() => navigate("/teacher/grading")}>Open grading</Button>
          </Stack>
        ))}
        {!rows.length ? <Typography color="text.secondary">Queue is clear.</Typography> : null}
      </Stack>
    </ListingPage>
  );
};

export default GradingQueuePage;
