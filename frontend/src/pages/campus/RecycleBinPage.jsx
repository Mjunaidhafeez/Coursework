import RestoreFromTrashRoundedIcon from "@mui/icons-material/RestoreFromTrashRounded";
import { Button, Checkbox, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import BulkActionBar from "../../components/shared/BulkActionBar";
import ListingPage from "../../components/shared/ListingPage";
import { useUi } from "../../context/UiContext";
import useRowSelection from "../../hooks/useRowSelection";

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

  const restoreUser = async (userId) => {
    await api.post(ENDPOINTS.campusRecycle, { user_id: userId });
    notify("User restored");
    usersSel.clear();
    load();
  };

  const restoreNotice = async (noticeId) => {
    await api.post(ENDPOINTS.campusRecycle, { notice_id: noticeId });
    notify("Notice restored");
    noticesSel.clear();
    load();
  };

  const restoreSelectedUsers = async () => {
    if (!usersSel.count) return;
    await api.post(ENDPOINTS.campusRecycle, { user_ids: usersSel.selectedIds });
    notify("Selected users restored");
    usersSel.clear();
    load();
  };

  const restoreSelectedNotices = async () => {
    if (!noticesSel.count) return;
    await api.post(ENDPOINTS.campusRecycle, { notice_ids: noticesSel.selectedIds });
    notify("Selected notices restored");
    noticesSel.clear();
    load();
  };

  return (
    <ListingPage title="Recycle bin" icon={<RestoreFromTrashRoundedIcon />} subtitle="Deactivated users and deleted notices">
      <Stack spacing={1.4}>
        <Typography sx={{ fontWeight: 800 }}>Users</Typography>
        <BulkActionBar
          count={usersSel.count}
          onClear={usersSel.clear}
          onDelete={restoreSelectedUsers}
          deleteLabel="Restore selected"
          deleteColor="success"
        />
        {(data.users || []).map((item) => (
          <Stack key={item.id} direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1, border: "1px solid #e2e8f0", borderRadius: 1.5 }}>
            <Stack direction="row" spacing={0.6} alignItems="center">
              <Checkbox size="small" checked={usersSel.isSelected(item.id)} onChange={() => usersSel.toggle(item.id)} />
              <Typography>{item.name || item.username} ({item.role})</Typography>
            </Stack>
            <Button size="small" onClick={() => restoreUser(item.id)}>Restore</Button>
          </Stack>
        ))}
        <Typography sx={{ fontWeight: 800 }}>Notices</Typography>
        <BulkActionBar
          count={noticesSel.count}
          onClear={noticesSel.clear}
          onDelete={restoreSelectedNotices}
          deleteLabel="Restore selected"
          deleteColor="success"
        />
        {(data.notices || []).map((item) => (
          <Stack key={item.id} direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1, border: "1px solid #e2e8f0", borderRadius: 1.5 }}>
            <Stack direction="row" spacing={0.6} alignItems="center">
              <Checkbox size="small" checked={noticesSel.isSelected(item.id)} onChange={() => noticesSel.toggle(item.id)} />
              <Typography>{item.title}</Typography>
            </Stack>
            <Button size="small" onClick={() => restoreNotice(item.id)}>Restore</Button>
          </Stack>
        ))}
      </Stack>
    </ListingPage>
  );
};

export default RecycleBinPage;
