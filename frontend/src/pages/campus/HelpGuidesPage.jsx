import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import { Button, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import ListingPage from "../../components/shared/ListingPage";
import { useAuth } from "../../context/AuthContext";
import { useUi } from "../../context/UiContext";
import { listRows } from "./listRows";

const HelpGuidesPage = () => {
  const { user } = useAuth();
  const { notify } = useUi();
  const isAdmin = user?.role === "super_admin";
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(null);
  const [form, setForm] = useState({ title: "", slug: "", body: "", audience: "all" });

  const load = async () => {
    const { data } = await api.get(`${ENDPOINTS.campusHelp}?page_size=50`);
    setRows(listRows(data));
  };

  useEffect(() => {
    load().catch(() => notify("Could not load help", "error"));
  }, []);

  const save = async () => {
    try {
      await api.post(ENDPOINTS.campusHelp, form);
      setForm({ title: "", slug: "", body: "", audience: "all" });
      notify("Guide published");
      load();
    } catch (err) {
      notify(err?.response?.data?.detail || "Could not save guide", "error");
    }
  };

  return (
    <ListingPage title="Help guides" icon={<HelpOutlineRoundedIcon />} subtitle="How-to pages written by admin">
      <Stack spacing={1.2}>
        {isAdmin ? (
          <Stack spacing={1} sx={{ p: 1.1, border: "1px solid #dbeafe", borderRadius: 2, bgcolor: "#f8fbff" }}>
            <TextField size="small" label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <TextField size="small" label="Slug (optional)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            <TextField size="small" multiline minRows={4} label="Guide" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            <Button variant="contained" onClick={save} sx={{ alignSelf: "flex-start" }}>Publish guide</Button>
          </Stack>
        ) : null}
        {rows.map((item) => (
          <Stack key={item.id} sx={{ p: 1, border: "1px solid #e2e8f0", borderRadius: 1.5, cursor: "pointer" }} onClick={() => setOpen(open === item.id ? null : item.id)}>
            <Typography sx={{ fontWeight: 800 }}>{item.title}</Typography>
            {open === item.id ? <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mt: 0.8 }}>{item.body}</Typography> : null}
          </Stack>
        ))}
      </Stack>
    </ListingPage>
  );
};

export default HelpGuidesPage;
