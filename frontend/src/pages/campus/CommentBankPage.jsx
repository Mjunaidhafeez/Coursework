import ChatRoundedIcon from "@mui/icons-material/ChatRounded";
import { Button, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import ListingPage from "../../components/shared/ListingPage";
import { useUi } from "../../context/UiContext";
import { listRows } from "./listRows";

const CommentBankPage = () => {
  const { notify } = useUi();
  const [rows, setRows] = useState([]);
  const [phrase, setPhrase] = useState("");

  const load = async () => {
    const { data } = await api.get(`${ENDPOINTS.campusComments}?page_size=100`);
    setRows(listRows(data));
  };

  useEffect(() => {
    load().catch(() => notify("Could not load comments", "error"));
  }, []);

  const save = async () => {
    try {
      await api.post(ENDPOINTS.campusComments, { phrase });
      setPhrase("");
      notify("Phrase saved");
      load();
    } catch (err) {
      notify(err?.response?.data?.detail || "Could not save phrase", "error");
    }
  };

  const copy = async (text) => {
    await navigator.clipboard.writeText(text);
    notify("Copied for grading");
  };

  return (
    <ListingPage title="Comment bank" icon={<ChatRoundedIcon />} subtitle="Saved feedback phrases to paste while grading">
      <Stack spacing={1.2}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField size="small" fullWidth label="New phrase" value={phrase} onChange={(e) => setPhrase(e.target.value)} />
          <Button variant="contained" onClick={save}>Save</Button>
        </Stack>
        {rows.map((item) => (
          <Stack key={item.id} direction="row" justifyContent="space-between" sx={{ p: 1, border: "1px solid #e2e8f0", borderRadius: 1.5 }}>
            <Typography>{item.phrase}</Typography>
            <Button size="small" onClick={() => copy(item.phrase)}>Copy</Button>
          </Stack>
        ))}
      </Stack>
    </ListingPage>
  );
};

export default CommentBankPage;
