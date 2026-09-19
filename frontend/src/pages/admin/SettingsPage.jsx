import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import PaletteRoundedIcon from "@mui/icons-material/PaletteRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import ListingPage from "../../components/shared/ListingPage";
import { COMMS, CommsSection } from "../../components/shared/commsUi";
import { usePortalSettings } from "../../context/PortalSettingsContext";
import { useUi } from "../../context/UiContext";
import { THEME_PRESETS } from "../../theme/portalTheme";
import { MODULE_CATALOG } from "../../utils/roleConfig";

const SettingsPage = () => {
  const { settings, apply } = usePortalSettings();
  const { notify } = useUi();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");

  useEffect(() => {
    setForm((prev) => ({ ...prev, ...settings, modules: settings.modules, labels: settings.labels }));
  }, [settings]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const setModule = (role, key, enabled) => {
    setForm((prev) => ({
      ...prev,
      modules: {
        ...prev.modules,
        [role]: { ...(prev.modules?.[role] || {}), [key]: enabled },
      },
    }));
  };

  const setLabel = (role, key, value) => {
    setForm((prev) => ({
      ...prev,
      labels: {
        ...prev.labels,
        [role]: { ...(prev.labels?.[role] || {}), [key]: value },
      },
    }));
  };

  const uploadImage = async (kind, file) => {
    if (!file) return;
    const payload = new FormData();
    payload.append("file", file);
    payload.append("kind", kind);
    setUploading(kind);
    try {
      const { data } = await api.post(ENDPOINTS.portalSettingsUpload, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (data.settings) apply(data.settings);
      if (kind === "logo") setField("logo_url", data.url);
      else setField("login_background_url", data.url);
      notify("Image saved");
    } catch (err) {
      notify(err?.response?.data?.detail || "Could not upload image", "error");
    } finally {
      setUploading("");
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch(ENDPOINTS.portalSettings, {
        app_name: form.app_name,
        university_name: form.university_name,
        tagline: form.tagline,
        login_subtitle: form.login_subtitle,
        footer_text: form.footer_text,
        sidebar_title: form.sidebar_title,
        admin_header: form.admin_header,
        teacher_header: form.teacher_header,
        student_header: form.student_header,
        login_button_text: form.login_button_text,
        theme: form.theme,
        logo_url: form.logo_url,
        login_background_url: form.login_background_url,
        modules: form.modules,
        labels: form.labels,
        weekly_digest: form.weekly_digest,
      });
      apply(data);
      notify("Portal settings saved");
    } catch (err) {
      notify(err?.response?.data?.detail || "Could not save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ListingPage
      title="Settings"
      icon={<SettingsRoundedIcon />}
      subtitle="Brand this portal for any university. Hide teacher/student modules, change names, colors, and the login page."
      actions={(
        <Button variant="contained" startIcon={<SaveRoundedIcon />} disabled={saving} onClick={save}>
          {saving ? "Saving..." : "Save settings"}
        </Button>
      )}
    >
      <Stack spacing={1.2}>
        <Alert severity="info" sx={{ py: 0.7 }}>
          Kal doosri university ho to yahan se app name, login text, background, logo, top/side titles, aur colors change karo. Code mein hardcode nahi karna.
        </Alert>

        <CommsSection icon={<VisibilityOutlinedIcon />} title="Brand & login" subtitle="Name, headers, login copy, logo, background" accent={COMMS.ink}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.1}>
            <TextField size="small" fullWidth label="Application name" value={form.app_name || ""} onChange={(e) => setField("app_name", e.target.value)} helperText="Sidebar / email / browser title" />
            <TextField size="small" fullWidth label="University / institute" value={form.university_name || ""} onChange={(e) => setField("university_name", e.target.value)} />
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.1} sx={{ mt: 1.1 }}>
            <TextField size="small" fullWidth label="Login headline" value={form.tagline || ""} onChange={(e) => setField("tagline", e.target.value)} />
            <TextField size="small" fullWidth label="Login button" value={form.login_button_text || ""} onChange={(e) => setField("login_button_text", e.target.value)} />
          </Stack>
          <TextField size="small" fullWidth multiline minRows={2} label="Login subtitle" value={form.login_subtitle || ""} onChange={(e) => setField("login_subtitle", e.target.value)} sx={{ mt: 1.1 }} />
          <TextField size="small" fullWidth label="Login footer / credit line" value={form.footer_text || ""} onChange={(e) => setField("footer_text", e.target.value)} sx={{ mt: 1.1 }} />
          <TextField size="small" fullWidth label="Sidebar brand (optional)" value={form.sidebar_title || ""} onChange={(e) => setField("sidebar_title", e.target.value)} helperText="Empty = application name" sx={{ mt: 1.1 }} />
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.1} sx={{ mt: 1.1 }}>
            <TextField size="small" fullWidth label="Admin top title" value={form.admin_header || ""} onChange={(e) => setField("admin_header", e.target.value)} />
            <TextField size="small" fullWidth label="Teacher top title" value={form.teacher_header || ""} onChange={(e) => setField("teacher_header", e.target.value)} />
            <TextField size="small" fullWidth label="Student top title" value={form.student_header || ""} onChange={(e) => setField("student_header", e.target.value)} />
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.1} sx={{ mt: 1.2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 0.6, color: COMMS.ink }}>Logo</Typography>
              {form.logo_url ? <Box component="img" src={form.logo_url} alt="Logo" sx={{ height: 44, objectFit: "contain", mb: 0.8, display: "block" }} /> : null}
              <TextField size="small" fullWidth label="Logo URL" value={form.logo_url || ""} onChange={(e) => setField("logo_url", e.target.value)} sx={{ mb: 0.8 }} />
              <Button size="small" variant="outlined" component="label" startIcon={<CloudUploadRoundedIcon />} disabled={uploading === "logo"}>
                {uploading === "logo" ? "Uploading..." : "Upload logo"}
                <input hidden type="file" accept="image/*" onChange={(e) => uploadImage("logo", e.target.files?.[0])} />
              </Button>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 0.6, color: COMMS.ink }}>Login background</Typography>
              {form.login_background_url ? <Box component="img" src={form.login_background_url} alt="Background" sx={{ width: "100%", maxHeight: 88, objectFit: "cover", borderRadius: 1, mb: 0.8 }} /> : null}
              <TextField size="small" fullWidth label="Background image URL" value={form.login_background_url || ""} onChange={(e) => setField("login_background_url", e.target.value)} sx={{ mb: 0.8 }} />
              <Button size="small" variant="outlined" component="label" startIcon={<CloudUploadRoundedIcon />} disabled={uploading === "login_background"}>
                {uploading === "login_background" ? "Uploading..." : "Upload background"}
                <input hidden type="file" accept="image/*" onChange={(e) => uploadImage("login_background", e.target.files?.[0])} />
              </Button>
            </Box>
          </Stack>
        </CommsSection>

        <CommsSection icon={<PaletteRoundedIcon />} title="Color template" subtitle="4 ready themes for another university or ERP look" accent={COMMS.ink}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap flexWrap="wrap">
            {Object.values(THEME_PRESETS).map((preset) => {
              const selected = form.theme === preset.id;
              return (
                <Box
                  key={preset.id}
                  onClick={() => setField("theme", preset.id)}
                  sx={{
                    flex: "1 1 160px",
                    minWidth: 150,
                    border: selected ? `2px solid ${preset.primary}` : `1px solid ${COMMS.line}`,
                    borderRadius: 2,
                    p: 1,
                    cursor: "pointer",
                    bgcolor: selected ? `${preset.primary}10` : "#fff",
                  }}
                >
                  <Stack direction="row" spacing={0.5} sx={{ mb: 0.7 }}>
                    {[preset.primary, preset.navy, preset.accent, preset.secondary].map((color) => (
                      <Box key={color} sx={{ width: 22, height: 22, borderRadius: 1, bgcolor: color }} />
                    ))}
                  </Stack>
                  <Typography sx={{ fontWeight: 800, fontSize: 13 }}>{preset.label}</Typography>
                  <Typography sx={{ fontSize: 11, color: COMMS.muted }}>{preset.hint}</Typography>
                  {selected ? <Chip size="small" color="primary" label="Active" sx={{ mt: 0.6, height: 20 }} /> : null}
                </Box>
              );
            })}
          </Stack>
        </CommsSection>

        <CommsSection icon={<SettingsRoundedIcon />} title="Weekly digest" subtitle="Optional daily PA task: python manage.py weekly_digest" accent={COMMS.ink}>
          <FormControlLabel
            control={<Switch checked={Boolean(form.weekly_digest)} onChange={(e) => setField("weekly_digest", e.target.checked)} />}
            label="Email students a weekly deadline digest"
          />
        </CommsSection>

        {["teacher", "student"].map((role) => (
          <CommsSection
            key={role}
            icon={<SettingsRoundedIcon />}
            title={`${role === "teacher" ? "Teacher" : "Student"} modules`}
            subtitle="Off modules hide from the side menu. Dashboard always stays on."
            accent={COMMS.ink}
          >
            <Stack spacing={0.8}>
              {(MODULE_CATALOG[role] || []).map((item) => (
                <Stack key={item.key} direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                  <FormControlLabel
                    sx={{ minWidth: 220 }}
                    control={(
                      <Switch
                        checked={form.modules?.[role]?.[item.key] !== false}
                        onChange={(e) => setModule(role, item.key, e.target.checked)}
                      />
                    )}
                    label={item.label}
                  />
                  <TextField
                    size="small"
                    fullWidth
                    label="Menu name"
                    value={form.labels?.[role]?.[item.key] || ""}
                    placeholder={item.label}
                    onChange={(e) => setLabel(role, item.key, e.target.value)}
                  />
                </Stack>
              ))}
            </Stack>
          </CommsSection>
        ))}
      </Stack>
    </ListingPage>
  );
};

export default SettingsPage;
