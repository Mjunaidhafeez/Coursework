import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import { Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import ListingPage from "../../components/shared/ListingPage";
import { useUi } from "../../context/UiContext";
import { listRows } from "./listRows";

const AuditLogPage = () => {
  const { notify } = useUi();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get(ENDPOINTS.campusAudit)
      .then((res) => setRows(listRows(res.data)))
      .catch(() => notify("Could not load audit log", "error"));
  }, []);

  return (
    <ListingPage title="Audit log" icon={<HistoryRoundedIcon />} subtitle="Recent admin and staff actions">
      <Stack spacing={0.7}>
        {rows.map((item) => (
          <Stack key={item.id} sx={{ p: 1, border: "1px solid #e2e8f0", borderRadius: 1.5 }}>
            <Typography sx={{ fontWeight: 700 }}>{item.action} · {item.object_type}</Typography>
            <Typography variant="caption" color="text.secondary">{item.actor} · {item.created_at ? new Date(item.created_at).toLocaleString() : ""}</Typography>
          </Stack>
        ))}
        {!rows.length ? <Typography color="text.secondary">No audit entries yet.</Typography> : null}
      </Stack>
    </ListingPage>
  );
};

export default AuditLogPage;
