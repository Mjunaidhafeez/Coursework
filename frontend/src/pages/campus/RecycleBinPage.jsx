import RestoreFromTrashRoundedIcon from "@mui/icons-material/RestoreFromTrashRounded";
import { Button, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import ListingPage from "../../components/shared/ListingPage";
import { useUi } from "../../context/UiContext";

const RecycleBinPage = () => {
  const { notify } = useUi();
  const [data, setData] = useState({ users: [], notices: [] });

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
    load();
  };

  const restoreNotice = async (noticeId) => {
    await api.post(ENDPOINTS.campusRecycle, { notice_id: noticeId });
    notify("Notice restored");
    load();
  };

  return (
    <ListingPage title="Recycle bin" icon={<RestoreFromTrashRoundedIcon />} subtitle="Deactivated users and deleted notices">
      <Stack spacing={1.4}>
        <Typography sx={{ fontWeight: 800 }}>Users</Typography>
        {(data.users || []).map((item) => (
          <Stack key={item.id} direction="row" justifyContent="space-between" sx={{ p: 1, border: "1px solid #e2e8f0", borderRadius: 1.5 }}>
            <Typography>{item.name || item.username} ({item.role})</Typography>
            <Button size="small" onClick={() => restoreUser(item.id)}>Restore</Button>
          </Stack>
        ))}
        <Typography sx={{ fontWeight: 800 }}>Notices</Typography>
        {(data.notices || []).map((item) => (
          <Stack key={item.id} direction="row" justifyContent="space-between" sx={{ p: 1, border: "1px solid #e2e8f0", borderRadius: 1.5 }}>
            <Typography>{item.title}</Typography>
            <Button size="small" onClick={() => restoreNotice(item.id)}>Restore</Button>
          </Stack>
        ))}
      </Stack>
    </ListingPage>
  );
};

export default RecycleBinPage;
