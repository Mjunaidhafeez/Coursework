import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Button, Stack, Switch, FormControlLabel, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import CompactTabs from "../../components/shared/CompactTabs";
import ListingPage from "../../components/shared/ListingPage";
import { useUi } from "../../context/UiContext";
import { listRows } from "../campus/listRows";

const emptyAnnouncement = { title: "", excerpt: "", body: "", image_url: "", published: true };
const emptyGallery = { title: "", album: "Campus", image_url: "", published: true };
const emptyDownload = { title: "", description: "", file_url: "", published: true };

const WebsiteCmsPage = () => {
  const { notify } = useUi();
  const [tab, setTab] = useState("brand");
  const [form, setForm] = useState({});
  const [announcements, setAnnouncements] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [announcement, setAnnouncement] = useState(emptyAnnouncement);
  const [photo, setPhoto] = useState(emptyGallery);
  const [download, setDownload] = useState(emptyDownload);

  const load = async () => {
    const [settingsRes, annRes, galRes, dlRes] = await Promise.all([
      api.get(ENDPOINTS.websiteSettings),
      api.get(`${ENDPOINTS.websiteAnnouncements}?page_size=50`),
      api.get(`${ENDPOINTS.websiteGallery}?page_size=50`),
      api.get(`${ENDPOINTS.websiteDownloads}?page_size=50`),
    ]);
    setForm(settingsRes.data);
    setAnnouncements(listRows(annRes.data));
    setGallery(listRows(galRes.data));
    setDownloads(listRows(dlRes.data));
  };

  useEffect(() => {
    load().catch(() => notify("Could not load website CMS", "error"));
  }, []);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const setPage = (slug, key, value) => {
    setForm((prev) => ({
      ...prev,
      pages: { ...(prev.pages || {}), [slug]: { ...(prev.pages?.[slug] || {}), [key]: value } },
    }));
  };

  const saveSettings = async () => {
    try {
      const { data } = await api.patch(ENDPOINTS.websiteSettings, form);
      setForm(data);
      notify("Website saved");
    } catch (err) {
      notify(err?.response?.data?.detail || "Could not save website", "error");
    }
  };

  const upload = async (file, onUrl) => {
    if (!file) return;
    const payload = new FormData();
    payload.append("file", file);
    const { data } = await api.post(ENDPOINTS.websiteUpload, payload, { headers: { "Content-Type": "multipart/form-data" } });
    onUrl(data.url);
    notify("File uploaded");
  };

  const createAnnouncement = async () => {
    await api.post(ENDPOINTS.websiteAnnouncements, announcement);
    setAnnouncement(emptyAnnouncement);
    load();
  };
  const createGallery = async () => {
    await api.post(ENDPOINTS.websiteGallery, photo);
    setPhoto(emptyGallery);
    load();
  };
  const createDownload = async () => {
    await api.post(ENDPOINTS.websiteDownloads, download);
    setDownload(emptyDownload);
    load();
  };

  const pages = form.pages || {};
  const home = pages.home || {};
  const about = pages.about || {};
  const vc = pages.vc || {};
  const programs = pages.programs || {};
  const admissions = pages.admissions || {};

  return (
    <ListingPage
      title="University website"
      icon={<LanguageRoundedIcon />}
      subtitle="Every public page, color, logo, menu, and the Login button is edited here."
      actions={<Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={saveSettings}>Save website</Button>}
    >
      <Stack spacing={1.2}>
        <CompactTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "brand", label: "Brand" },
            { value: "pages", label: "Pages" },
            { value: "announcements", label: "Announcements" },
            { value: "gallery", label: "Gallery" },
            { value: "downloads", label: "Downloads" },
            { value: "login", label: "Login button" },
          ]}
        />

        {tab === "brand" ? (
          <Stack spacing={1}>
            <TextField size="small" label="Site name" value={form.site_name || ""} onChange={(e) => setField("site_name", e.target.value)} />
            <TextField size="small" label="Tagline" value={form.tagline || ""} onChange={(e) => setField("tagline", e.target.value)} />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <TextField size="small" label="Primary color" value={form.primary_color || ""} onChange={(e) => setField("primary_color", e.target.value)} />
              <TextField size="small" label="Accent color" value={form.accent_color || ""} onChange={(e) => setField("accent_color", e.target.value)} />
            </Stack>
            <TextField size="small" label="Logo URL" value={form.logo_url || ""} onChange={(e) => setField("logo_url", e.target.value)} />
            <Button size="small" variant="outlined" component="label">Upload logo<input hidden type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0], (url) => setField("logo_url", url))} /></Button>
            <TextField size="small" label="Hero image URL" value={form.hero_image_url || ""} onChange={(e) => setField("hero_image_url", e.target.value)} />
            <Button size="small" variant="outlined" component="label">Upload hero<input hidden type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0], (url) => setField("hero_image_url", url))} /></Button>
            <TextField size="small" label="Footer text" value={form.footer_text || ""} onChange={(e) => setField("footer_text", e.target.value)} />
            <TextField size="small" label="Phone" value={form.phone || ""} onChange={(e) => setField("phone", e.target.value)} />
            <TextField size="small" label="Email" value={form.email || ""} onChange={(e) => setField("email", e.target.value)} />
            <TextField size="small" label="Address" value={form.address || ""} onChange={(e) => setField("address", e.target.value)} />
            <TextField size="small" label="Facebook" value={form.facebook || ""} onChange={(e) => setField("facebook", e.target.value)} />
            <TextField size="small" label="Twitter / X" value={form.twitter || ""} onChange={(e) => setField("twitter", e.target.value)} />
            <TextField size="small" label="Instagram" value={form.instagram || ""} onChange={(e) => setField("instagram", e.target.value)} />
            <TextField size="small" label="YouTube" value={form.youtube || ""} onChange={(e) => setField("youtube", e.target.value)} />
            <TextField
              size="small"
              multiline
              minRows={4}
              label="Navigation JSON"
              value={JSON.stringify(form.nav || [], null, 2)}
              onChange={(e) => {
                try {
                  setField("nav", JSON.parse(e.target.value));
                } catch {
                  // keep typing
                }
              }}
              helperText='[{"label":"Home","path":"/"}]'
            />
          </Stack>
        ) : null}

        {tab === "pages" ? (
          <Stack spacing={1.2}>
            <Typography sx={{ fontWeight: 800 }}>Home</Typography>
            <TextField size="small" label="Hero title" value={home.hero_title || ""} onChange={(e) => setPage("home", "hero_title", e.target.value)} />
            <TextField size="small" multiline minRows={2} label="Hero subtitle" value={home.hero_subtitle || ""} onChange={(e) => setPage("home", "hero_subtitle", e.target.value)} />
            <Typography sx={{ fontWeight: 800 }}>About</Typography>
            <TextField size="small" label="Title" value={about.title || ""} onChange={(e) => setPage("about", "title", e.target.value)} />
            <TextField size="small" multiline minRows={2} label="Mission" value={about.mission || ""} onChange={(e) => setPage("about", "mission", e.target.value)} />
            <TextField size="small" multiline minRows={3} label="History" value={about.history || ""} onChange={(e) => setPage("about", "history", e.target.value)} />
            <Typography sx={{ fontWeight: 800 }}>VC message</Typography>
            <TextField size="small" label="Title" value={vc.title || ""} onChange={(e) => setPage("vc", "title", e.target.value)} />
            <TextField size="small" label="Name" value={vc.name || ""} onChange={(e) => setPage("vc", "name", e.target.value)} />
            <TextField size="small" label="Role" value={vc.role || ""} onChange={(e) => setPage("vc", "role", e.target.value)} />
            <TextField size="small" label="Photo URL" value={vc.photo_url || ""} onChange={(e) => setPage("vc", "photo_url", e.target.value)} />
            <Button size="small" variant="outlined" component="label">Upload VC photo<input hidden type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0], (url) => setPage("vc", "photo_url", url))} /></Button>
            <TextField size="small" multiline minRows={5} label="Letter" value={vc.body || ""} onChange={(e) => setPage("vc", "body", e.target.value)} />
            <Typography sx={{ fontWeight: 800 }}>Programs</Typography>
            <TextField size="small" label="Title" value={programs.title || ""} onChange={(e) => setPage("programs", "title", e.target.value)} />
            <TextField size="small" multiline minRows={2} label="Intro" value={programs.intro || ""} onChange={(e) => setPage("programs", "intro", e.target.value)} />
            <TextField
              size="small"
              multiline
              minRows={5}
              label="Program cards JSON"
              value={JSON.stringify(programs.items || [], null, 2)}
              onChange={(e) => {
                try { setPage("programs", "items", JSON.parse(e.target.value)); } catch { /* keep */ }
              }}
            />
            <Typography sx={{ fontWeight: 800 }}>Admissions</Typography>
            <TextField size="small" label="Title" value={admissions.title || ""} onChange={(e) => setPage("admissions", "title", e.target.value)} />
            <TextField size="small" multiline minRows={2} label="Intro" value={admissions.intro || ""} onChange={(e) => setPage("admissions", "intro", e.target.value)} />
            <TextField size="small" multiline minRows={3} label="Requirements" value={admissions.requirements || ""} onChange={(e) => setPage("admissions", "requirements", e.target.value)} />
            <TextField
              size="small"
              multiline
              minRows={5}
              label="Steps JSON"
              value={JSON.stringify(admissions.steps || [], null, 2)}
              onChange={(e) => {
                try { setPage("admissions", "steps", JSON.parse(e.target.value)); } catch { /* keep */ }
              }}
            />
          </Stack>
        ) : null}

        {tab === "announcements" ? (
          <Stack spacing={1}>
            <TextField size="small" label="Title" value={announcement.title} onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })} />
            <TextField size="small" label="Excerpt" value={announcement.excerpt} onChange={(e) => setAnnouncement({ ...announcement, excerpt: e.target.value })} />
            <TextField size="small" multiline minRows={3} label="Body" value={announcement.body} onChange={(e) => setAnnouncement({ ...announcement, body: e.target.value })} />
            <TextField size="small" label="Image URL" value={announcement.image_url} onChange={(e) => setAnnouncement({ ...announcement, image_url: e.target.value })} />
            <Button size="small" variant="outlined" component="label">Upload image<input hidden type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0], (url) => setAnnouncement((prev) => ({ ...prev, image_url: url })))} /></Button>
            <Button variant="contained" onClick={createAnnouncement} sx={{ alignSelf: "flex-start" }}>Publish announcement</Button>
            {announcements.map((item) => (
              <Typography key={item.id} sx={{ p: 1, border: "1px solid #e2e8f0", borderRadius: 1.5 }}>{item.title}</Typography>
            ))}
          </Stack>
        ) : null}

        {tab === "gallery" ? (
          <Stack spacing={1}>
            <TextField size="small" label="Title" value={photo.title} onChange={(e) => setPhoto({ ...photo, title: e.target.value })} />
            <TextField size="small" label="Album" value={photo.album} onChange={(e) => setPhoto({ ...photo, album: e.target.value })} />
            <TextField size="small" label="Image URL" value={photo.image_url} onChange={(e) => setPhoto({ ...photo, image_url: e.target.value })} />
            <Button size="small" variant="outlined" component="label">Upload photo<input hidden type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0], (url) => setPhoto((prev) => ({ ...prev, image_url: url })))} /></Button>
            <Button variant="contained" onClick={createGallery} sx={{ alignSelf: "flex-start" }}>Add photo</Button>
            {gallery.map((item) => (
              <Typography key={item.id} sx={{ p: 1, border: "1px solid #e2e8f0", borderRadius: 1.5 }}>{item.album} · {item.title || "Photo"}</Typography>
            ))}
          </Stack>
        ) : null}

        {tab === "downloads" ? (
          <Stack spacing={1}>
            <TextField size="small" label="Title" value={download.title} onChange={(e) => setDownload({ ...download, title: e.target.value })} />
            <TextField size="small" label="Description" value={download.description} onChange={(e) => setDownload({ ...download, description: e.target.value })} />
            <TextField size="small" label="File URL" value={download.file_url} onChange={(e) => setDownload({ ...download, file_url: e.target.value })} />
            <Button size="small" variant="outlined" component="label">Upload file<input hidden type="file" onChange={(e) => upload(e.target.files?.[0], (url) => setDownload((prev) => ({ ...prev, file_url: url })))} /></Button>
            <Button variant="contained" onClick={createDownload} sx={{ alignSelf: "flex-start" }}>Add download</Button>
            {downloads.map((item) => (
              <Typography key={item.id} sx={{ p: 1, border: "1px solid #e2e8f0", borderRadius: 1.5 }}>{item.title}</Typography>
            ))}
          </Stack>
        ) : null}

        {tab === "login" ? (
          <Stack spacing={1}>
            <FormControlLabel
              control={<Switch checked={form.show_login_button !== false} onChange={(e) => setField("show_login_button", e.target.checked)} />}
              label="Show Login button on the public website"
            />
            <TextField size="small" label="Button label" value={form.login_label || ""} onChange={(e) => setField("login_label", e.target.value)} />
            <TextField size="small" label="Login path" value={form.login_path || "/login"} onChange={(e) => setField("login_path", e.target.value)} helperText="Default /login opens the portal" />
          </Stack>
        ) : null}
      </Stack>
    </ListingPage>
  );
};

export default WebsiteCmsPage;
