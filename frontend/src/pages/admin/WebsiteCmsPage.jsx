import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Alert, Box, Button, FormControlLabel, Paper, Stack, Switch, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import CmsMediaField from "../../components/shared/CmsMediaField";
import CompactTabs from "../../components/shared/CompactTabs";
import ListingPage from "../../components/shared/ListingPage";
import { useUi } from "../../context/UiContext";
import { extractApiErrorMessage } from "../../utils/apiErrors";
import { coverAndExtras, mergeUploadedUrls, uploadWebsiteFiles } from "../../utils/websiteCms";
import { listRows } from "../campus/listRows";

const emptyAnnouncement = { title: "", excerpt: "", body: "", image_url: "", image_urls: [], published: true };
const emptyGallery = { title: "", album: "Campus", image_url: "", published: true };
const emptyDownload = { title: "", description: "", file_url: "", published: true };
const emptyTeacher = { name: "", designation: "", department: "", degrees: "", bio: "", photo_url: "", published: true };
const emptyAlumni = { name: "", batch: "", program: "", current_role: "", story: "", photo_url: "", published: true };
const emptyResult = { student_name: "", roll_no: "", program: "", year: "", grade: "", marks: "", teacher_names: "", degrees: "", photo_url: "", published: true };
const emptyStudent = { name: "", roll_no: "", semester: "", class_name: "", note: "", photo_url: "", published: true };
const emptyActivity = { title: "", body: "", image_url: "", image_urls: [], posted_on: "", semester: "", class_name: "", published: true };

const TABS = [
  { value: "brand", label: "Brand" },
  { value: "pages", label: "Pages" },
  { value: "teachers", label: "Faculty" },
  { value: "alumni", label: "Alumni" },
  { value: "students", label: "Students" },
  { value: "activities", label: "Activities" },
  { value: "results", label: "Results" },
  { value: "announcements", label: "Announcements" },
  { value: "gallery", label: "Gallery" },
  { value: "downloads", label: "Downloads" },
  { value: "inquiries", label: "Inquiries" },
  { value: "login", label: "Login" },
];

const hexColor = (value, fallback) => (/^#[0-9a-fA-F]{6}$/.test(value || "") ? value : fallback);

const ColorField = ({ label, value, fallback, onChange }) => (
  <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, minWidth: 160 }}>
    <Box
      component="input"
      type="color"
      value={hexColor(value, fallback)}
      onChange={(e) => onChange(e.target.value)}
      sx={{ width: 42, height: 38, p: 0, border: "1px solid #d5deea", borderRadius: 1, bgcolor: "#fff", cursor: "pointer" }}
    />
    <TextField size="small" label={label} value={value || ""} onChange={(e) => onChange(e.target.value)} fullWidth />
  </Stack>
);

const Panel = ({ title, hint, children }) => (
  <Paper variant="outlined" sx={{ p: 1.4, borderColor: "#e2e8f0", borderRadius: 2 }}>
    {title ? <Typography sx={{ fontWeight: 800, mb: 0.4 }}>{title}</Typography> : null}
    {hint ? (
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.1 }}>
        {hint}
      </Typography>
    ) : null}
    <Stack spacing={1}>{children}</Stack>
  </Paper>
);

const PublishedList = ({ rows, titleOf, imageOf, onRemove }) => (
  <Stack spacing={0.8}>
    {!rows.length ? <Typography color="text.secondary">Nothing published yet.</Typography> : null}
    {rows.map((item) => (
      <Stack key={item.id} direction="row" spacing={1} alignItems="center" sx={{ p: 1, border: "1px solid #e2e8f0", borderRadius: 1.5 }}>
        {imageOf?.(item) ? (
          <Box component="img" src={imageOf(item)} alt="" sx={{ width: 52, height: 52, objectFit: "cover", borderRadius: 1 }} />
        ) : null}
        <Typography sx={{ flex: 1, minWidth: 0 }}>{titleOf(item)}</Typography>
        <Button size="small" color="error" onClick={() => onRemove(item.id)}>
          Remove
        </Button>
      </Stack>
    ))}
  </Stack>
);

const WebsiteCmsPage = () => {
  const { notify } = useUi();
  const [tab, setTab] = useState("brand");
  const [form, setForm] = useState({});
  const [lists, setLists] = useState({
    announcements: [],
    gallery: [],
    downloads: [],
    teachers: [],
    alumni: [],
    results: [],
    students: [],
    activities: [],
    inquiries: [],
  });
  const [announcement, setAnnouncement] = useState(emptyAnnouncement);
  const [photo, setPhoto] = useState(emptyGallery);
  const [download, setDownload] = useState(emptyDownload);
  const [teacher, setTeacher] = useState(emptyTeacher);
  const [alumnus, setAlumnus] = useState(emptyAlumni);
  const [result, setResult] = useState(emptyResult);
  const [student, setStudent] = useState(emptyStudent);
  const [activity, setActivity] = useState(emptyActivity);
  const [reply, setReply] = useState({});
  const [busy, setBusy] = useState("");

  const load = async () => {
    const [settingsRes, annRes, galRes, dlRes, teachRes, alumRes, resRes, stuRes, actRes, inqRes] = await Promise.all([
      api.get(ENDPOINTS.websiteSettings),
      api.get(`${ENDPOINTS.websiteAnnouncements}?page_size=50`),
      api.get(`${ENDPOINTS.websiteGallery}?page_size=120`),
      api.get(`${ENDPOINTS.websiteDownloads}?page_size=80`),
      api.get(`${ENDPOINTS.websiteTeachers}?page_size=50`),
      api.get(`${ENDPOINTS.websiteAlumni}?page_size=50`),
      api.get(`${ENDPOINTS.websiteResults}?page_size=50`),
      api.get(`${ENDPOINTS.websiteStudents}?page_size=200`),
      api.get(`${ENDPOINTS.websiteActivities}?page_size=100`),
      api.get(`${ENDPOINTS.websiteInquiries}?page_size=50`),
    ]);
    setForm(settingsRes.data);
    setLists({
      announcements: listRows(annRes.data),
      gallery: listRows(galRes.data),
      downloads: listRows(dlRes.data),
      teachers: listRows(teachRes.data),
      alumni: listRows(alumRes.data),
      results: listRows(resRes.data),
      students: listRows(stuRes.data),
      activities: listRows(actRes.data),
      inquiries: listRows(inqRes.data),
    });
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
  const setFlag = (key, enabled) => {
    setForm((prev) => ({ ...prev, page_flags: { ...(prev.page_flags || {}), [key]: enabled, home: true } }));
  };

  const pickFiles = async (files, applyUrls) => {
    setBusy("upload");
    try {
      const urls = await uploadWebsiteFiles(api, ENDPOINTS.websiteUpload, files);
      if (!urls.length) throw new Error("Upload returned no file URL");
      applyUrls(urls);
      notify(urls.length > 1 ? `${urls.length} files uploaded` : "File uploaded");
      return urls;
    } catch (err) {
      notify(extractApiErrorMessage(err), "error");
      return [];
    } finally {
      setBusy("");
    }
  };

  const createRow = async (endpoint, payload, reset, ok = "Published on the website") => {
    setBusy("save");
    try {
      await api.post(endpoint, payload);
      reset();
      await load();
      notify(ok);
    } catch (err) {
      notify(extractApiErrorMessage(err), "error");
    } finally {
      setBusy("");
    }
  };

  const createMany = async (endpoint, items, reset, ok) => {
    if (!items.length) return;
    setBusy("save");
    try {
      await api.post(`${endpoint}bulk/`, { items });
      reset();
      await load();
      notify(ok);
    } catch (err) {
      notify(extractApiErrorMessage(err), "error");
    } finally {
      setBusy("");
    }
  };

  const removeRow = async (endpoint, id) => {
    try {
      await api.delete(`${endpoint}${id}/`);
      await load();
    } catch (err) {
      notify(extractApiErrorMessage(err), "error");
    }
  };

  const activityImages = mergeUploadedUrls([activity.image_url], activity.image_urls);
  const announcementImages = mergeUploadedUrls([announcement.image_url], announcement.image_urls);

  const publishActivity = () => {
    if (!activity.title.trim() || !activity.body.trim()) {
      notify("Activity title and details are required", "error");
      return;
    }
    const media = coverAndExtras(activityImages);
    return createRow(
      ENDPOINTS.websiteActivities,
      { ...activity, ...media, posted_on: activity.posted_on || new Date().toISOString().slice(0, 10) },
      () => setActivity(emptyActivity),
      "Activity published on the website"
    );
  };

  const publishAnnouncement = () => {
    if (!announcement.title.trim() || !announcement.body.trim()) {
      notify("Announcement title and body are required", "error");
      return;
    }
    const media = coverAndExtras(announcementImages);
    return createRow(ENDPOINTS.websiteAnnouncements, { ...announcement, ...media }, () => setAnnouncement(emptyAnnouncement), "Announcement published");
  };

  const publishGallery = async (files) => {
    const uploaded = files?.length ? await pickFiles(files, () => {}) : [];
    const urls = mergeUploadedUrls([photo.image_url], uploaded);
    if (!urls.length) {
      notify("Choose one or more photos first", "error");
      return;
    }
    return createMany(
      ENDPOINTS.websiteGallery,
      urls.map((image_url) => ({ title: photo.title, album: photo.album || "Campus", image_url, published: true })),
      () => setPhoto(emptyGallery),
      `${urls.length} photo${urls.length === 1 ? "" : "s"} published`
    );
  };

  const publishDownloads = async (files) => {
    const list = Array.from(files || []);
    const uploaded = list.length ? await pickFiles(list, () => {}) : [];
    const urls = mergeUploadedUrls([download.file_url], uploaded);
    if (!urls.length) {
      notify("Choose one or more files first", "error");
      return;
    }
    return createMany(
      ENDPOINTS.websiteDownloads,
      urls.map((file_url, idx) => ({
        title: download.title || list[idx]?.name?.replace(/\.[^.]+$/, "") || "Download",
        description: download.description,
        file_url,
        original_name: list[idx]?.name || "",
        published: true,
      })),
      () => setDownload(emptyDownload),
      `${urls.length} file${urls.length === 1 ? "" : "s"} published`
    );
  };

  const saveSettings = async () => {
    setBusy("settings");
    try {
      const { data } = await api.patch(ENDPOINTS.websiteSettings, form);
      setForm(data);
      if (activity.title.trim() && activity.body.trim()) await publishActivity();
      else if (photo.image_url) await publishGallery();
      else if (announcement.title.trim() && announcement.body.trim()) await publishAnnouncement();
      notify("Website saved");
    } catch (err) {
      notify(extractApiErrorMessage(err), "error");
    } finally {
      setBusy("");
    }
  };

  const importPortalStudents = async () => {
    try {
      const { data } = await api.post(`${ENDPOINTS.websiteStudents}import-portal/`);
      notify(`Imported ${data.created} students, skipped ${data.skipped}`);
      load();
    } catch (err) {
      notify(extractApiErrorMessage(err), "error");
    }
  };

  const sendReply = async (id) => {
    try {
      await api.post(`${ENDPOINTS.websiteInquiries}${id}/reply/`, { body: reply[id] || "" });
      notify("Reply emailed and saved in Messages");
      setReply((prev) => ({ ...prev, [id]: "" }));
      load();
    } catch (err) {
      notify(extractApiErrorMessage(err), "error");
    }
  };

  const pages = form.pages || {};
  const flags = form.page_flags || {};
  const catalog = form.page_catalog || [];

  return (
    <ListingPage
      title="University website"
      icon={<LanguageRoundedIcon />}
      subtitle="Brand, pages, and campus content for the public website."
      actions={
        <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={saveSettings} disabled={Boolean(busy)}>
          Save website
        </Button>
      }
    >
      <Stack spacing={1.3}>
        <Alert severity="info" sx={{ py: 0.4 }}>
          Save website updates brand, colours, pages, and login. Activities, gallery, and downloads go live when you publish them — you can select multiple files at once.
        </Alert>
        <CompactTabs value={tab} onChange={setTab} tabs={TABS} />

        {tab === "brand" ? (
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.2} alignItems="stretch">
            <Panel title="Identity" hint="This name, logo, and colours appear on every public page.">
              <TextField size="small" label="Site name" value={form.site_name || ""} onChange={(e) => setField("site_name", e.target.value)} />
              <TextField size="small" label="Tagline" value={form.tagline || ""} onChange={(e) => setField("tagline", e.target.value)} />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <ColorField label="Primary" value={form.primary_color} fallback="#102a5c" onChange={(value) => setField("primary_color", value)} />
                <ColorField label="Accent" value={form.accent_color} fallback="#c9a227" onChange={(value) => setField("accent_color", value)} />
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <ColorField label="Secondary" value={form.secondary_color} fallback="#8c1d2c" onChange={(value) => setField("secondary_color", value)} />
                <ColorField label="Header" value={form.header_color} fallback="#0b1c40" onChange={(value) => setField("header_color", value)} />
                <ColorField label="Footer" value={form.footer_color} fallback="#071428" onChange={(value) => setField("footer_color", value)} />
              </Stack>
              <TextField size="small" label="Footer text" value={form.footer_text || ""} onChange={(e) => setField("footer_text", e.target.value)} />
              <TextField size="small" label="Phone" value={form.phone || ""} onChange={(e) => setField("phone", e.target.value)} />
              <TextField size="small" label="Email" value={form.email || ""} onChange={(e) => setField("email", e.target.value)} />
              <TextField size="small" label="Address" value={form.address || ""} onChange={(e) => setField("address", e.target.value)} />
              <TextField size="small" label="Facebook" value={form.facebook || ""} onChange={(e) => setField("facebook", e.target.value)} />
              <TextField size="small" label="Twitter / X" value={form.twitter || ""} onChange={(e) => setField("twitter", e.target.value)} />
              <TextField size="small" label="Instagram" value={form.instagram || ""} onChange={(e) => setField("instagram", e.target.value)} />
              <TextField size="small" label="YouTube" value={form.youtube || ""} onChange={(e) => setField("youtube", e.target.value)} />
            </Panel>
            <Panel title="Logo & hero" hint="Upload one image at a time. Changes appear after Save website.">
              {form.logo_url ? <Box component="img" src={form.logo_url} alt="" sx={{ height: 56, objectFit: "contain" }} /> : null}
              <CmsMediaField
                urls={form.logo_url ? [form.logo_url] : []}
                onUrls={(urls) => setField("logo_url", urls[0] || "")}
                multiple={false}
                label="Upload logo"
                busy={busy === "upload"}
                onPick={(files) => pickFiles(files, (urls) => setField("logo_url", urls[0] || ""))}
              />
              {form.hero_image_url ? (
                <Box component="img" src={form.hero_image_url} alt="" sx={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 1.5 }} />
              ) : null}
              <CmsMediaField
                urls={form.hero_image_url ? [form.hero_image_url] : []}
                onUrls={(urls) => setField("hero_image_url", urls[0] || "")}
                multiple={false}
                label="Upload hero"
                busy={busy === "upload"}
                onPick={(files) => pickFiles(files, (urls) => setField("hero_image_url", urls[0] || ""))}
              />
              <Paper sx={{ p: 2, bgcolor: form.header_color || "#0b1c40", color: "#fff", borderRadius: 2 }}>
                <Typography sx={{ fontWeight: 800 }}>{form.site_name || "University"}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  {form.tagline || "Your public website preview"}
                </Typography>
              </Paper>
            </Panel>
          </Stack>
        ) : null}

        {tab === "pages" ? (
          <Stack spacing={1.2}>
            <Typography color="text.secondary">Switch a page off to hide it from the public menu. Home stays on.</Typography>
            {catalog.map((item) => {
              const page = pages[item.key] || {};
              return (
                <Panel key={item.key} title={item.label}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                    <FormControlLabel
                      disabled={item.key === "home"}
                      control={<Switch checked={flags[item.key] !== false} onChange={(e) => setFlag(item.key, e.target.checked)} />}
                      label="Visible"
                    />
                    <TextField size="small" label="Menu name" value={page.nav_label || ""} onChange={(e) => setPage(item.key, "nav_label", e.target.value)} />
                    <TextField
                      size="small"
                      label="Page title"
                      value={page.title || page.hero_title || ""}
                      onChange={(e) => setPage(item.key, item.key === "home" ? "hero_title" : "title", e.target.value)}
                    />
                  </Stack>
                  {page.background_url ? (
                    <Box component="img" src={page.background_url} alt="" sx={{ width: "100%", maxHeight: 120, objectFit: "cover", borderRadius: 1 }} />
                  ) : null}
                  <CmsMediaField
                    urls={page.background_url ? [page.background_url] : []}
                    onUrls={(urls) => setPage(item.key, "background_url", urls[0] || "")}
                    multiple={false}
                    label="Upload background"
                    busy={busy === "upload"}
                    onPick={(files) => pickFiles(files, (urls) => setPage(item.key, "background_url", urls[0] || ""))}
                  />
                  <TextField
                    size="small"
                    multiline
                    minRows={2}
                    label={item.key === "home" ? "Hero subtitle" : "Intro / body"}
                    value={page.hero_subtitle || page.intro || page.mission || page.body || ""}
                    onChange={(e) => {
                      const key = item.key === "home" ? "hero_subtitle" : item.key === "about" ? "mission" : item.key === "vc" ? "body" : "intro";
                      setPage(item.key, key, e.target.value);
                    }}
                  />
                </Panel>
              );
            })}
          </Stack>
        ) : null}

        {tab === "teachers" ? (
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
            <Panel title="Add faculty" hint="Portal teachers with “Show on website” appear automatically. Use this for extra profiles.">
              <TextField size="small" label="Name" value={teacher.name} onChange={(e) => setTeacher({ ...teacher, name: e.target.value })} />
              <TextField size="small" label="Designation" value={teacher.designation} onChange={(e) => setTeacher({ ...teacher, designation: e.target.value })} />
              <TextField size="small" label="Department" value={teacher.department} onChange={(e) => setTeacher({ ...teacher, department: e.target.value })} />
              <TextField size="small" label="Professional degrees" value={teacher.degrees} onChange={(e) => setTeacher({ ...teacher, degrees: e.target.value })} />
              <TextField size="small" multiline minRows={2} label="Bio" value={teacher.bio} onChange={(e) => setTeacher({ ...teacher, bio: e.target.value })} />
              <CmsMediaField
                urls={teacher.photo_url ? [teacher.photo_url] : []}
                onUrls={(urls) => setTeacher((prev) => ({ ...prev, photo_url: urls[0] || "" }))}
                multiple={false}
                label="Upload photo"
                busy={busy === "upload"}
                onPick={(files) => pickFiles(files, (urls) => setTeacher((prev) => ({ ...prev, photo_url: urls[0] || "" })))}
              />
              <Button variant="contained" disabled={Boolean(busy)} onClick={() => createRow(ENDPOINTS.websiteTeachers, teacher, () => setTeacher(emptyTeacher))} sx={{ alignSelf: "flex-start" }}>
                Add faculty
              </Button>
            </Panel>
            <Panel title="Published faculty">
              <PublishedList rows={lists.teachers} titleOf={(item) => `${item.name} · ${item.degrees || item.designation || ""}`} imageOf={(item) => item.photo_url} onRemove={(id) => removeRow(ENDPOINTS.websiteTeachers, id)} />
            </Panel>
          </Stack>
        ) : null}

        {tab === "alumni" ? (
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
            <Panel title="Add alumnus">
              <TextField size="small" label="Name" value={alumnus.name} onChange={(e) => setAlumnus({ ...alumnus, name: e.target.value })} />
              <TextField size="small" label="Batch" value={alumnus.batch} onChange={(e) => setAlumnus({ ...alumnus, batch: e.target.value })} />
              <TextField size="small" label="Program" value={alumnus.program} onChange={(e) => setAlumnus({ ...alumnus, program: e.target.value })} />
              <TextField size="small" label="Current role" value={alumnus.current_role} onChange={(e) => setAlumnus({ ...alumnus, current_role: e.target.value })} />
              <TextField size="small" multiline minRows={2} label="Story" value={alumnus.story} onChange={(e) => setAlumnus({ ...alumnus, story: e.target.value })} />
              <CmsMediaField
                urls={alumnus.photo_url ? [alumnus.photo_url] : []}
                onUrls={(urls) => setAlumnus((prev) => ({ ...prev, photo_url: urls[0] || "" }))}
                multiple={false}
                label="Upload photo"
                busy={busy === "upload"}
                onPick={(files) => pickFiles(files, (urls) => setAlumnus((prev) => ({ ...prev, photo_url: urls[0] || "" })))}
              />
              <Button variant="contained" disabled={Boolean(busy)} onClick={() => createRow(ENDPOINTS.websiteAlumni, alumnus, () => setAlumnus(emptyAlumni))} sx={{ alignSelf: "flex-start" }}>
                Add alumnus
              </Button>
            </Panel>
            <Panel title="Published alumni">
              <PublishedList rows={lists.alumni} titleOf={(item) => `${item.name} · ${item.batch || ""}`} imageOf={(item) => item.photo_url} onRemove={(id) => removeRow(ENDPOINTS.websiteAlumni, id)} />
            </Panel>
          </Stack>
        ) : null}

        {tab === "results" ? (
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
            <Panel title="Add result">
              <TextField size="small" label="Student name" value={result.student_name} onChange={(e) => setResult({ ...result, student_name: e.target.value })} />
              <TextField size="small" label="Roll no" value={result.roll_no} onChange={(e) => setResult({ ...result, roll_no: e.target.value })} />
              <TextField size="small" label="Program" value={result.program} onChange={(e) => setResult({ ...result, program: e.target.value })} />
              <TextField size="small" label="Year" value={result.year} onChange={(e) => setResult({ ...result, year: e.target.value })} />
              <TextField size="small" label="Grade / CGPA" value={result.grade} onChange={(e) => setResult({ ...result, grade: e.target.value })} />
              <TextField size="small" label="Marks" value={result.marks} onChange={(e) => setResult({ ...result, marks: e.target.value })} />
              <TextField size="small" label="Teacher names" value={result.teacher_names} onChange={(e) => setResult({ ...result, teacher_names: e.target.value })} />
              <TextField size="small" label="Degrees" value={result.degrees} onChange={(e) => setResult({ ...result, degrees: e.target.value })} />
              <CmsMediaField
                urls={result.photo_url ? [result.photo_url] : []}
                onUrls={(urls) => setResult((prev) => ({ ...prev, photo_url: urls[0] || "" }))}
                multiple={false}
                label="Upload student photo"
                busy={busy === "upload"}
                onPick={(files) => pickFiles(files, (urls) => setResult((prev) => ({ ...prev, photo_url: urls[0] || "" })))}
              />
              <Button variant="contained" disabled={Boolean(busy)} onClick={() => createRow(ENDPOINTS.websiteResults, result, () => setResult(emptyResult))} sx={{ alignSelf: "flex-start" }}>
                Add result
              </Button>
            </Panel>
            <Panel title="Published results">
              <PublishedList rows={lists.results} titleOf={(item) => `${item.student_name} · ${item.roll_no}`} imageOf={(item) => item.photo_url} onRemove={(id) => removeRow(ENDPOINTS.websiteResults, id)} />
            </Panel>
          </Stack>
        ) : null}

        {tab === "students" ? (
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
            <Panel title="Extra student profiles" hint="Portal students with “Show on website” appear automatically.">
              <Button variant="outlined" onClick={importPortalStudents} sx={{ alignSelf: "flex-start" }}>
                Publish portal students
              </Button>
              <TextField size="small" label="Name" value={student.name} onChange={(e) => setStudent({ ...student, name: e.target.value })} />
              <TextField size="small" label="Roll no" value={student.roll_no} onChange={(e) => setStudent({ ...student, roll_no: e.target.value })} />
              <TextField size="small" label="Semester" value={student.semester} onChange={(e) => setStudent({ ...student, semester: e.target.value })} />
              <TextField size="small" label="Class / course" value={student.class_name} onChange={(e) => setStudent({ ...student, class_name: e.target.value })} />
              <TextField size="small" label="Note" value={student.note} onChange={(e) => setStudent({ ...student, note: e.target.value })} />
              <CmsMediaField
                urls={student.photo_url ? [student.photo_url] : []}
                onUrls={(urls) => setStudent((prev) => ({ ...prev, photo_url: urls[0] || "" }))}
                multiple={false}
                label="Upload photo"
                busy={busy === "upload"}
                onPick={(files) => pickFiles(files, (urls) => setStudent((prev) => ({ ...prev, photo_url: urls[0] || "" })))}
              />
              <Button variant="contained" disabled={Boolean(busy)} onClick={() => createRow(ENDPOINTS.websiteStudents, student, () => setStudent(emptyStudent))} sx={{ alignSelf: "flex-start" }}>
                Add student
              </Button>
            </Panel>
            <Panel title="CMS student profiles">
              <PublishedList rows={lists.students} titleOf={(item) => `${item.name} · ${item.roll_no}`} imageOf={(item) => item.photo_url} onRemove={(id) => removeRow(ENDPOINTS.websiteStudents, id)} />
            </Panel>
          </Stack>
        ) : null}

        {tab === "activities" ? (
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
            <Panel title="Publish activity" hint="Select several photos together. They stay with this one post on the website.">
              <TextField size="small" label="Title" value={activity.title} onChange={(e) => setActivity({ ...activity, title: e.target.value })} />
              <TextField size="small" type="date" label="Date" InputLabelProps={{ shrink: true }} value={activity.posted_on} onChange={(e) => setActivity({ ...activity, posted_on: e.target.value })} />
              <TextField size="small" label="Semester (optional)" value={activity.semester} onChange={(e) => setActivity({ ...activity, semester: e.target.value })} />
              <TextField size="small" label="Class (optional)" value={activity.class_name} onChange={(e) => setActivity({ ...activity, class_name: e.target.value })} />
              <TextField size="small" multiline minRows={3} label="What happened" value={activity.body} onChange={(e) => setActivity({ ...activity, body: e.target.value })} />
              <CmsMediaField
                urls={activityImages}
                onUrls={(urls) => setActivity((prev) => ({ ...prev, ...coverAndExtras(urls) }))}
                label="Upload photos"
                busy={busy === "upload"}
                onPick={(files) => pickFiles(files, (urls) => setActivity((prev) => ({ ...prev, ...coverAndExtras(mergeUploadedUrls([prev.image_url], [...(prev.image_urls || []), ...urls])) })))}
              />
              <Button variant="contained" disabled={Boolean(busy)} onClick={publishActivity} sx={{ alignSelf: "flex-start" }}>
                Publish activity
              </Button>
            </Panel>
            <Panel title="Published activities">
              <PublishedList
                rows={lists.activities}
                titleOf={(item) => `${item.posted_on} · ${item.title}`}
                imageOf={(item) => item.image_url || item.image_urls?.[0]}
                onRemove={(id) => removeRow(ENDPOINTS.websiteActivities, id)}
              />
            </Panel>
          </Stack>
        ) : null}

        {tab === "announcements" ? (
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
            <Panel title="Publish announcement" hint="You can attach several images to one announcement.">
              <TextField size="small" label="Title" value={announcement.title} onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })} />
              <TextField size="small" label="Excerpt" value={announcement.excerpt} onChange={(e) => setAnnouncement({ ...announcement, excerpt: e.target.value })} />
              <TextField size="small" multiline minRows={3} label="Body" value={announcement.body} onChange={(e) => setAnnouncement({ ...announcement, body: e.target.value })} />
              <CmsMediaField
                urls={announcementImages}
                onUrls={(urls) => setAnnouncement((prev) => ({ ...prev, ...coverAndExtras(urls) }))}
                label="Upload images"
                busy={busy === "upload"}
                onPick={(files) => pickFiles(files, (urls) => setAnnouncement((prev) => ({ ...prev, ...coverAndExtras(mergeUploadedUrls([prev.image_url], [...(prev.image_urls || []), ...urls])) })))}
              />
              <Button variant="contained" disabled={Boolean(busy)} onClick={publishAnnouncement} sx={{ alignSelf: "flex-start" }}>
                Publish
              </Button>
            </Panel>
            <Panel title="Published announcements">
              <PublishedList rows={lists.announcements} titleOf={(item) => item.title} imageOf={(item) => item.image_url} onRemove={(id) => removeRow(ENDPOINTS.websiteAnnouncements, id)} />
            </Panel>
          </Stack>
        ) : null}

        {tab === "gallery" ? (
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
            <Panel title="Add photos" hint="Select many images in one go. Each file is saved as its own gallery photo.">
              <TextField size="small" label="Title (optional)" value={photo.title} onChange={(e) => setPhoto({ ...photo, title: e.target.value })} />
              <TextField size="small" label="Album" value={photo.album} onChange={(e) => setPhoto({ ...photo, album: e.target.value })} />
              <CmsMediaField
                urls={photo.image_url ? [photo.image_url] : []}
                onUrls={(urls) => setPhoto((prev) => ({ ...prev, image_url: urls[0] || "" }))}
                label="Choose photos"
                busy={busy === "upload"}
                onPick={(files) => publishGallery(files)}
              />
              <Button variant="contained" disabled={Boolean(busy)} onClick={() => publishGallery()} sx={{ alignSelf: "flex-start" }}>
                Add photo
              </Button>
            </Panel>
            <Panel title="Published gallery">
              <PublishedList rows={lists.gallery} titleOf={(item) => `${item.album} · ${item.title || "Photo"}`} imageOf={(item) => item.image_url} onRemove={(id) => removeRow(ENDPOINTS.websiteGallery, id)} />
            </Panel>
          </Stack>
        ) : null}

        {tab === "downloads" ? (
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
            <Panel title="Add downloads" hint="Select several files together. Each file becomes its own download.">
              <TextField size="small" label="Title (optional)" value={download.title} onChange={(e) => setDownload({ ...download, title: e.target.value })} />
              <TextField size="small" label="Description" value={download.description} onChange={(e) => setDownload({ ...download, description: e.target.value })} />
              <CmsMediaField
                urls={download.file_url ? [download.file_url] : []}
                onUrls={(urls) => setDownload((prev) => ({ ...prev, file_url: urls[0] || "" }))}
                accept=""
                label="Choose files"
                busy={busy === "upload"}
                onPick={(files) => publishDownloads(files)}
              />
              <Button variant="contained" disabled={Boolean(busy)} onClick={() => publishDownloads()} sx={{ alignSelf: "flex-start" }}>
                Add download
              </Button>
            </Panel>
            <Panel title="Published downloads">
              <PublishedList rows={lists.downloads} titleOf={(item) => item.title} onRemove={(id) => removeRow(ENDPOINTS.websiteDownloads, id)} />
            </Panel>
          </Stack>
        ) : null}

        {tab === "inquiries" ? (
          <Stack spacing={1.2}>
            <Typography color="text.secondary">Public Contact form messages land here and in Messages. Reply emails the visitor.</Typography>
            {lists.inquiries.map((item) => (
              <Panel key={item.id} title={`${item.name} · ${item.email} · ${item.status}`}>
                <Typography variant="body2">{item.subject}</Typography>
                <Typography variant="body2">{item.message}</Typography>
                {item.admin_reply ? (
                  <Typography variant="body2" color="text.secondary">
                    Replied: {item.admin_reply}
                  </Typography>
                ) : null}
                <TextField size="small" multiline minRows={2} label="Reply" value={reply[item.id] || ""} onChange={(e) => setReply((prev) => ({ ...prev, [item.id]: e.target.value }))} />
                <Button size="small" variant="contained" onClick={() => sendReply(item.id)} sx={{ alignSelf: "flex-start" }}>
                  Send reply
                </Button>
              </Panel>
            ))}
          </Stack>
        ) : null}

        {tab === "login" ? (
          <Panel title="Public login button">
            <FormControlLabel
              control={<Switch checked={form.show_login_button !== false} onChange={(e) => setField("show_login_button", e.target.checked)} />}
              label="Show Login button on the public website"
            />
            <TextField size="small" label="Button label" value={form.login_label || ""} onChange={(e) => setField("login_label", e.target.value)} />
            <TextField size="small" label="Login path" value={form.login_path || "/login"} onChange={(e) => setField("login_path", e.target.value)} />
          </Panel>
        ) : null}
      </Stack>
    </ListingPage>
  );
};

export default WebsiteCmsPage;
