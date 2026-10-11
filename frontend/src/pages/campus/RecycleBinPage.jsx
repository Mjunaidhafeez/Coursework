import RestoreFromTrashRoundedIcon from "@mui/icons-material/RestoreFromTrashRounded";
import { Button, Checkbox, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import BulkActionBar from "../../components/shared/BulkActionBar";
import ListingPage from "../../components/shared/ListingPage";
import { useUi } from "../../context/UiContext";
import useRowSelection from "../../hooks/useRowSelection";
import { extractApiErrorMessage } from "../../utils/apiErrors";
import { confirmPermanentDelete } from "../../utils/confirm";

const userLabel = (item) => {
  const name = (item.name || "").trim();
  const username = item.username || `#${item.id}`;
  return name && name !== username ? `${name} · ${username} (${item.role})` : `${username} (${item.role})`;
};

const RecycleBinPage = () => {
  const { notify } = useUi();
  const [data, setData] = useState({ users: [], notices: [] });
  const usersSel = useRowSelection();
  const noticesSel = useRowSelection();

  const load = async () => {
    const { data: payload } = await api.get(ENDPOINTS.campusRecycle);
    setData(payload);
  };

  useEffect(() => {
    load().catch(() => notify("Could not load recycle bin", "error"));
  }, []);

  const restore = async (payload, message) => {
    try {
      await api.post(ENDPOINTS.campusRecycle, payload);
      notify(message);
      usersSel.clear();
      noticesSel.clear();
      await load();
    } catch (error) {
      notify(extractApiErrorMessage(error, "Could not restore"), "error");
    }
  };

  const purge = async (payload, entityLabel, count = 1) => {
    if (!confirmPermanentDelete(entityLabel, count)) return;
    try {
      await api.delete(ENDPOINTS.campusRecycle, { data: payload });
      notify(
        payload.user_id || payload.user_ids?.length
          ? "Permanently deleted. Username and roll no can be used again."
          : "Permanently deleted."
      );
      usersSel.clear();
      noticesSel.clear();
      await load();
    } catch (error) {
      notify(extractApiErrorMessage(error, "Could not permanently delete"), "error");
    }
  };

  return (
    <ListingPage title="Recycle bin" icon={<RestoreFromTrashRoundedIcon />} subtitle="Restore or permanently delete deactivated users and notices">
      <Stack spacing={1.4}>
        <Typography sx={{ fontWeight: 800 }}>Users</Typography>
        <BulkActionBar
          count={usersSel.count}
          onClear={usersSel.clear}
          onDelete={() => purge({ user_ids: usersSel.selectedIds }, "users", usersSel.count)}
          deleteLabel="Delete permanently"
          updateSlot={(
            <Button size="small" color="success" variant="contained" onClick={() => restore({ user_ids: usersSel.selectedIds }, "Selected users restored")}>
              Restore selected
            </Button>
          )}
        />
        {(data.users || []).map((item) => (
          <Stack key={item.id} direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1, border: "1px solid #e2e8f0", borderRadius: 1.5 }}>
            <Stack direction="row" spacing={0.6} alignItems="center">
              <Checkbox size="small" checked={usersSel.isSelected(item.id)} onChange={() => usersSel.toggle(item.id)} />
              <Typography>{userLabel(item)}</Typography>
            </Stack>
            <Stack direction="row" spacing={0.6}>
              <Button size="small" onClick={() => restore({ user_id: item.id }, "User restored")}>Restore</Button>
              <Button size="small" color="error" onClick={() => purge({ user_id: item.id }, "user")}>Delete permanently</Button>
            </Stack>
          </Stack>
        ))}
        {!(data.users || []).length ? <Typography variant="body2" color="text.secondary">No deactivated users.</Typography> : null}
        <Typography sx={{ fontWeight: 800 }}>Notices</Typography>
        <BulkActionBar
          count={noticesSel.count}
          onClear={noticesSel.clear}
          onDelete={() => purge({ notice_ids: noticesSel.selectedIds }, "notices", noticesSel.count)}
          deleteLabel="Delete permanently"
          updateSlot={(
            <Button size="small" color="success" variant="contained" onClick={() => restore({ notice_ids: noticesSel.selectedIds }, "Selected notices restored")}>
              Restore selected
            </Button>
          )}
        />
        {(data.notices || []).map((item) => (
          <Stack key={item.id} direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1, border: "1px solid #e2e8f0", borderRadius: 1.5 }}>
            <Stack direction="row" spacing={0.6} alignItems="center">
              <Checkbox size="small" checked={noticesSel.isSelected(item.id)} onChange={() => noticesSel.toggle(item.id)} />
              <Typography>{item.title}</Typography>
            </Stack>
            <Stack direction="row" spacing={0.6}>
              <Button size="small" onClick={() => restore({ notice_id: item.id }, "Notice restored")}>Restore</Button>
              <Button size="small" color="error" onClick={() => purge({ notice_id: item.id }, "notice")}>Delete permanently</Button>
            </Stack>
          </Stack>
        ))}
        {!(data.notices || []).length ? <Typography variant="body2" color="text.secondary">No deleted notices.</Typography> : null}
      </Stack>
    </ListingPage>
  );
};

export default RecycleBinPage;
