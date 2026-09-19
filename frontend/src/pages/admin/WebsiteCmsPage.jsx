import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Button, FormControlLabel, Stack, Switch, TextField, Typography } from "@mui/material";
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
const emptyTeacher = { name: "", designation: "", department: "", degrees: "", bio: "", photo_url: "", published: true };
const emptyAlumni = { name: "", batch: "", program: "", current_role: "", story: "", photo_url: "", published: true };
const emptyResult = { student_name: "", roll_no: "", program: "", year: "", grade: "", marks: "", teacher_names: "", degrees: "", photo_url: "", published: true };
const emptyStudent = { name: "", roll_no: "", semester: "", class_name: "", note: "", photo_url: "", published: true };
const emptyActivity = { title: "", body: "", image_url: "", posted_on: "", semester: "", class_name: "", published: true };

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

const WebsiteCmsPage = () => {
  const { notify } = useUi();
  const [tab, setTab] = useState("brand");
  const [form, setForm] = useState({});
  const [lists, setLists] = useState({ announcements: [], gallery: [], downloads: [], teachers: [], alumni: [], results: [], students: [], activities: [], inquiries: [] });
  const [announcement, setAnnouncement] = useState(emptyAnnouncement);
  const [photo, setPhoto] = useState(emptyGallery);
  const [download, setDownload] = useState(emptyDownload);
  const [teacher, setTeacher] = useState(emptyTeacher);
  const [alumnus, setAlumnus] = useState(emptyAlumni);
  const [result, setResult] = useState(emptyResult);
  const [student, setStudent] = useState(emptyStudent);
  const [activity, setActivity] = useState(emptyActivity);
  const [reply, setReply] = useState({});

  const load = async () => {
    const [settingsRes, annRes, galRes, dlRes, teachRes, alumRes, resRes, stuRes, actRes, inqRes] = await Promise.all([
      api.get(ENDPOINTS.websiteSettings),
      api.get(`${ENDPOINTS.websiteAnnouncements}?page_size=50`),
      api.get(`${ENDPOINTS.websiteGallery}?page_size=50`),
      api.get(`${ENDPOINTS.websiteDownloads}?page_size=50`),
      api.get(`${ENDPOINTS.websiteTeachers}?page_size=50`),
      api.get(`${ENDPOINTS.websiteAlumni}?page_size=50`),
      api.get(`${ENDPOINTS.websiteResults}?page_size=50`),
      api.get(`${ENDPOINTS.websiteStudents}?page_size=200`),
      api.get(`${ENDPOINTS.websiteActivities}?page_size=80`),
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

  const createRow = async (endpoint, payload, reset) => {
    await api.post(endpoint, payload);
    reset();
    load();
  };
  const removeRow = async (endpoint, id) => {
    await api.delete(`${endpoint}${id}/`);
    load();
  };
  const importPortalStudents = async () => {
    try {
      const { data } = await api.post(`${ENDPOINTS.websiteStudents}import-portal/`);
      notify(`Imported ${data.created} students, skipped ${data.skipped}`);
      load();
    } catch (err) {
      notify(err?.response?.data?.detail || "Could not import portal students", "error");
    }
  };

  const sendReply = async (id) => {
    await api.post(`${ENDPOINTS.websiteInquiries}${id}/reply/`, { body: reply[id] || "" });
    notify("Reply emailed and saved in Messages");
    setReply((prev) => ({ ...prev, [id]: "" }));
    load();
  };

  const pages = form.pages || {};
  const flags = form.page_flags || {};
  const catalog = form.page_catalog || [];

  return (
    <ListingPage
      title="University website"
      icon={<LanguageRoundedIcon />}
      subtitle="Every page, color, image, menu item, and the Login button is controlled here. Turn pages on or off without code."
      actions={<Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={saveSettings}>Save website</Button>}
    >
      <Stack spacing={1.2}>
        <CompactTabs value={tab} onChange={setTab} tabs={TABS} />

        {tab === "brand" ? (
          <Stack spacing={1}>
            <TextField size="small" label="Site name" value={form.site_name || ""} onChange={(e) => setField("site_name", e.target.value)} />
            <TextField size="small" label="Tagline" value={form.tagline || ""} onChange={(e) => setField("tagline", e.target.value)} />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <TextField size="small" label="Primary" value={form.primary_color || ""} onChange={(e) => setField("primary_color", e.target.value)} />
              <TextField size="small" label="Accent" value={form.accent_color || ""} onChange={(e) => setField("accent_color", e.target.value)} />
              <TextField size="small" label="Secondary" value={form.secondary_color || ""} onChange={(e) => setField("secondary_color", e.target.value)} />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <TextField size="small" label="Header" value={form.header_color || ""} onChange={(e) => setField("header_color", e.target.value)} />
              <TextField size="small" label="Footer" value={form.footer_color || ""} onChange={(e) => setField("footer_color", e.target.value)} />
            </Stack>
            <TextField size="small" label="Logo URL" value={form.logo_url || ""} onChange={(e) => setField("logo_url", e.target.value)} />
            <Button size="small" variant="outlined" component="label">Upload logo<input hidden type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0], (url) => setField("logo_url", url))} /></Button>
            <TextField size="small" label="Home hero image URL" value={form.hero_image_url || ""} onChange={(e) => setField("hero_image_url", e.target.value)} />
            <Button size="small" variant="outlined" component="label">Upload hero<input hidden type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0], (url) => setField("hero_image_url", url))} /></Button>
            <TextField size="small" label="Footer text" value={form.footer_text || ""} onChange={(e) => setField("footer_text", e.target.value)} />
            <TextField size="small" label="Phone" value={form.phone || ""} onChange={(e) => setField("phone", e.target.value)} />
            <TextField size="small" label="Email" value={form.email || ""} onChange={(e) => setField("email", e.target.value)} />
            <TextField size="small" label="Address" value={form.address || ""} onChange={(e) => setField("address", e.target.value)} />
            <TextField size="small" label="Facebook" value={form.facebook || ""} onChange={(e) => setField("facebook", e.target.value)} />
            <TextField size="small" label="Twitter / X" value={form.twitter || ""} onChange={(e) => setField("twitter", e.target.value)} />
            <TextField size="small" label="Instagram" value={form.instagram || ""} onChange={(e) => setField("instagram", e.target.value)} />
            <TextField size="small" label="YouTube" value={form.youtube || ""} onChange={(e) => setField("youtube", e.target.value)} />
          </Stack>
        ) : null}

        {tab === "pages" ? (
          <Stack spacing={1.4}>
            <Typography color="text.secondary">Off pages hide from the public menu. Home stays on. Each page can have its own background image.</Typography>
            {catalog.map((item) => {
              const page = pages[item.key] || {};
              return (
                <Stack key={item.key} spacing={0.8} sx={{ p: 1.1, border: "1px solid #e2e8f0", borderRadius: 1.5 }}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                    <FormControlLabel
                      disabled={item.key === "home"}
                      control={<Switch checked={flags[item.key] !== false} onChange={(e) => setFlag(item.key, e.target.checked)} />}
                      label={item.label}
                    />
                    <TextField size="small" label="Menu name" value={page.nav_label || ""} onChange={(e) => setPage(item.key, "nav_label", e.target.value)} />
                    <TextField size="small" label="Page title" value={page.title || page.hero_title || ""} onChange={(e) => setPage(item.key, item.key === "home" ? "hero_title" : "title", e.target.value)} />
                  </Stack>
                  <TextField size="small" label="Background image URL" value={page.background_url || ""} onChange={(e) => setPage(item.key, "background_url", e.target.value)} />
                  <Button size="small" variant="outlined" component="label" sx={{ alignSelf: "flex-start" }}>
                    Upload background
                    <input hidden type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0], (url) => setPage(item.key, "background_url", url))} />
                  </Button>
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
                </Stack>
              );
            })}
          </Stack>
        ) : null}

        {tab === "teachers" ? (
          <Stack spacing={1}>
            <TextField size="small" label="Name" value={teacher.name} onChange={(e) => setTeacher({ ...teacher, name: e.target.value })} />
            <TextField size="small" label="Designation" value={teacher.designation} onChange={(e) => setTeacher({ ...teacher, designation: e.target.value })} />
            <TextField size="small" label="Department" value={teacher.department} onChange={(e) => setTeacher({ ...teacher, department: e.target.value })} />
            <TextField size="small" label="Professional degrees" value={teacher.degrees} onChange={(e) => setTeacher({ ...teacher, degrees: e.target.value })} />
            <TextField size="small" multiline minRows={2} label="Bio" value={teacher.bio} onChange={(e) => setTeacher({ ...teacher, bio: e.target.value })} />
            <TextField size="small" label="Photo URL" value={teacher.photo_url} onChange={(e) => setTeacher({ ...teacher, photo_url: e.target.value })} />
            <Button size="small" variant="outlined" component="label">Upload photo<input hidden type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0], (url) => setTeacher((p) => ({ ...p, photo_url: url })))} /></Button>
            <Button variant="contained" onClick={() => createRow(ENDPOINTS.websiteTeachers, teacher, () => setTeacher(emptyTeacher))} sx={{ alignSelf: "flex-start" }}>Add faculty</Button>
            {lists.teachers.map((item) => (
              <Stack key={item.id} direction="row" justifyContent="space-between" sx={{ p: 1, border: "1px solid #e2e8f0", borderRadius: 1.5 }}>
                <Typography>{item.name} · {item.degrees}</Typography>
                <Button size="small" color="error" onClick={() => removeRow(ENDPOINTS.websiteTeachers, item.id)}>Remove</Button>
              </Stack>
            ))}
          </Stack>
        ) : null}

        {tab === "alumni" ? (
          <Stack spacing={1}>
            <TextField size="small" label="Name" value={alumnus.name} onChange={(e) => setAlumnus({ ...alumnus, name: e.target.value })} />
            <TextField size="small" label="Batch" value={alumnus.batch} onChange={(e) => setAlumnus({ ...alumnus, batch: e.target.value })} />
            <TextField size="small" label="Program" value={alumnus.program} onChange={(e) => setAlumnus({ ...alumnus, program: e.target.value })} />
            <TextField size="small" label="Current role" value={alumnus.current_role} onChange={(e) => setAlumnus({ ...alumnus, current_role: e.target.value })} />
            <TextField size="small" multiline minRows={2} label="Story" value={alumnus.story} onChange={(e) => setAlumnus({ ...alumnus, story: e.target.value })} />
            <TextField size="small" label="Photo URL" value={alumnus.photo_url} onChange={(e) => setAlumnus({ ...alumnus, photo_url: e.target.value })} />
            <Button size="small" variant="outlined" component="label">Upload photo<input hidden type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0], (url) => setAlumnus((p) => ({ ...p, photo_url: url })))} /></Button>
            <Button variant="contained" onClick={() => createRow(ENDPOINTS.websiteAlumni, alumnus, () => setAlumnus(emptyAlumni))} sx={{ alignSelf: "flex-start" }}>Add alumnus</Button>
            {lists.alumni.map((item) => (
              <Stack key={item.id} direction="row" justifyContent="space-between" sx={{ p: 1, border: "1px solid #e2e8f0", borderRadius: 1.5 }}>
                <Typography>{item.name} · {item.batch}</Typography>
                <Button size="small" color="error" onClick={() => removeRow(ENDPOINTS.websiteAlumni, item.id)}>Remove</Button>
              </Stack>
            ))}
          </Stack>
        ) : null}

        {tab === "results" ? (
          <Stack spacing={1}>
            <TextField size="small" label="Student name" value={result.student_name} onChange={(e) => setResult({ ...result, student_name: e.target.value })} />
            <TextField size="small" label="Roll no" value={result.roll_no} onChange={(e) => setResult({ ...result, roll_no: e.target.value })} />
            <TextField size="small" label="Program" value={result.program} onChange={(e) => setResult({ ...result, program: e.target.value })} />
            <TextField size="small" label="Year" value={result.year} onChange={(e) => setResult({ ...result, year: e.target.value })} />
            <TextField size="small" label="Grade / CGPA" value={result.grade} onChange={(e) => setResult({ ...result, grade: e.target.value })} />
            <TextField size="small" label="Marks" value={result.marks} onChange={(e) => setResult({ ...result, marks: e.target.value })} />
            <TextField size="small" label="Teacher names" value={result.teacher_names} onChange={(e) => setResult({ ...result, teacher_names: e.target.value })} />
            <TextField size="small" label="Degrees" value={result.degrees} onChange={(e) => setResult({ ...result, degrees: e.target.value })} />
            <TextField size="small" label="Student photo URL" value={result.photo_url} onChange={(e) => setResult({ ...result, photo_url: e.target.value })} />
            <Button size="small" variant="outlined" component="label">Upload student photo<input hidden type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0], (url) => setResult((p) => ({ ...p, photo_url: url })))} /></Button>
            <Button variant="contained" onClick={() => createRow(ENDPOINTS.websiteResults, result, () => setResult(emptyResult))} sx={{ alignSelf: "flex-start" }}>Add result</Button>
            {lists.results.map((item) => (
              <Stack key={item.id} direction="row" justifyContent="space-between" sx={{ p: 1, border: "1px solid #e2e8f0", borderRadius: 1.5 }}>
                <Typography>{item.student_name} · {item.roll_no}</Typography>
                <Button size="small" color="error" onClick={() => removeRow(ENDPOINTS.websiteResults, item.id)}>Remove</Button>
              </Stack>
            ))}
          </Stack>
        ) : null}

        {tab === "students" ? (
          <Stack spacing={1}>
            <Typography color="text.secondary">Public site shows only name, photo, roll no, semester and class — no email or phone. Import copies active portal students, then you can remove any profile.</Typography>
            <Button variant="outlined" onClick={importPortalStudents} sx={{ alignSelf: "flex-start" }}>Publish portal students</Button>
            <TextField size="small" label="Name" value={student.name} onChange={(e) => setStudent({ ...student, name: e.target.value })} />
            <TextField size="small" label="Roll no" value={student.roll_no} onChange={(e) => setStudent({ ...student, roll_no: e.target.value })} />
            <TextField size="small" label="Semester" value={student.semester} onChange={(e) => setStudent({ ...student, semester: e.target.value })} placeholder="Semester 3" />
            <TextField size="small" label="Class / course" value={student.class_name} onChange={(e) => setStudent({ ...student, class_name: e.target.value })} placeholder="MBA Evening" />
            <TextField size="small" label="Note" value={student.note} onChange={(e) => setStudent({ ...student, note: e.target.value })} />
            <TextField size="small" label="Photo URL" value={student.photo_url} onChange={(e) => setStudent({ ...student, photo_url: e.target.value })} />
            <Button size="small" variant="outlined" component="label">Upload photo<input hidden type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0], (url) => setStudent((p) => ({ ...p, photo_url: url })))} /></Button>
            <Button variant="contained" onClick={() => createRow(ENDPOINTS.websiteStudents, student, () => setStudent(emptyStudent))} sx={{ alignSelf: "flex-start" }}>Add student</Button>
            {lists.students.map((item) => (
              <Stack key={item.id} direction="row" justifyContent="space-between" sx={{ p: 1, border: "1px solid #e2e8f0", borderRadius: 1.5 }}>
                <Typography>{item.name} · {item.roll_no} · {item.semester} · {item.class_name}</Typography>
                <Button size="small" color="error" onClick={() => removeRow(ENDPOINTS.websiteStudents, item.id)}>Remove</Button>
              </Stack>
            ))}
          </Stack>
        ) : null}

        {tab === "activities" ? (
          <Stack spacing={1}>
            <Typography color="text.secondary">Post daily student activities. Optional semester/class tags help visitors filter the public page.</Typography>
            <TextField size="small" label="Title" value={activity.title} onChange={(e) => setActivity({ ...activity, title: e.target.value })} />
            <TextField size="small" type="date" label="Date" InputLabelProps={{ shrink: true }} value={activity.posted_on} onChange={(e) => setActivity({ ...activity, posted_on: e.target.value })} />
            <TextField size="small" label="Semester (optional)" value={activity.semester} onChange={(e) => setActivity({ ...activity, semester: e.target.value })} />
            <TextField size="small" label="Class (optional)" value={activity.class_name} onChange={(e) => setActivity({ ...activity, class_name: e.target.value })} />
            <TextField size="small" multiline minRows={3} label="What happened" value={activity.body} onChange={(e) => setActivity({ ...activity, body: e.target.value })} />
            <TextField size="small" label="Image URL" value={activity.image_url} onChange={(e) => setActivity({ ...activity, image_url: e.target.value })} />
            <Button size="small" variant="outlined" component="label">Upload photo<input hidden type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0], (url) => setActivity((p) => ({ ...p, image_url: url })))} /></Button>
            <Button variant="contained" onClick={() => createRow(ENDPOINTS.websiteActivities, { ...activity, posted_on: activity.posted_on || new Date().toISOString().slice(0, 10) }, () => setActivity(emptyActivity))} sx={{ alignSelf: "flex-start" }}>Publish activity</Button>
            {lists.activities.map((item) => (
              <Stack key={item.id} direction="row" justifyContent="space-between" sx={{ p: 1, border: "1px solid #e2e8f0", borderRadius: 1.5 }}>
                <Typography>{item.posted_on} · {item.title}</Typography>
                <Button size="small" color="error" onClick={() => removeRow(ENDPOINTS.websiteActivities, item.id)}>Remove</Button>
              </Stack>
            ))}
          </Stack>
        ) : null}

        {tab === "announcements" ? (
          <Stack spacing={1}>
            <TextField size="small" label="Title" value={announcement.title} onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })} />
            <TextField size="small" label="Excerpt" value={announcement.excerpt} onChange={(e) => setAnnouncement({ ...announcement, excerpt: e.target.value })} />
            <TextField size="small" multiline minRows={3} label="Body" value={announcement.body} onChange={(e) => setAnnouncement({ ...announcement, body: e.target.value })} />
            <TextField size="small" label="Image URL" value={announcement.image_url} onChange={(e) => setAnnouncement({ ...announcement, image_url: e.target.value })} />
            <Button size="small" variant="outlined" component="label">Upload image<input hidden type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0], (url) => setAnnouncement((p) => ({ ...p, image_url: url })))} /></Button>
            <Button variant="contained" onClick={() => createRow(ENDPOINTS.websiteAnnouncements, announcement, () => setAnnouncement(emptyAnnouncement))} sx={{ alignSelf: "flex-start" }}>Publish</Button>
            {lists.announcements.map((item) => (
              <Stack key={item.id} direction="row" justifyContent="space-between" sx={{ p: 1, border: "1px solid #e2e8f0", borderRadius: 1.5 }}>
                <Typography>{item.title}</Typography>
                <Button size="small" color="error" onClick={() => removeRow(ENDPOINTS.websiteAnnouncements, item.id)}>Remove</Button>
              </Stack>
            ))}
          </Stack>
        ) : null}

        {tab === "gallery" ? (
          <Stack spacing={1}>
            <TextField size="small" label="Title" value={photo.title} onChange={(e) => setPhoto({ ...photo, title: e.target.value })} />
            <TextField size="small" label="Album" value={photo.album} onChange={(e) => setPhoto({ ...photo, album: e.target.value })} />
            <TextField size="small" label="Image URL" value={photo.image_url} onChange={(e) => setPhoto({ ...photo, image_url: e.target.value })} />
            <Button size="small" variant="outlined" component="label">Upload photo<input hidden type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0], (url) => setPhoto((p) => ({ ...p, image_url: url })))} /></Button>
            <Button variant="contained" onClick={() => createRow(ENDPOINTS.websiteGallery, photo, () => setPhoto(emptyGallery))} sx={{ alignSelf: "flex-start" }}>Add photo</Button>
            {lists.gallery.map((item) => (
              <Stack key={item.id} direction="row" justifyContent="space-between" sx={{ p: 1, border: "1px solid #e2e8f0", borderRadius: 1.5 }}>
                <Typography>{item.album} · {item.title || "Photo"}</Typography>
                <Button size="small" color="error" onClick={() => removeRow(ENDPOINTS.websiteGallery, item.id)}>Remove</Button>
              </Stack>
            ))}
          </Stack>
        ) : null}

        {tab === "downloads" ? (
          <Stack spacing={1}>
            <TextField size="small" label="Title" value={download.title} onChange={(e) => setDownload({ ...download, title: e.target.value })} />
            <TextField size="small" label="Description" value={download.description} onChange={(e) => setDownload({ ...download, description: e.target.value })} />
            <TextField size="small" label="File URL" value={download.file_url} onChange={(e) => setDownload({ ...download, file_url: e.target.value })} />
            <Button size="small" variant="outlined" component="label">Upload file<input hidden type="file" onChange={(e) => upload(e.target.files?.[0], (url) => setDownload((p) => ({ ...p, file_url: url })))} /></Button>
            <Button variant="contained" onClick={() => createRow(ENDPOINTS.websiteDownloads, download, () => setDownload(emptyDownload))} sx={{ alignSelf: "flex-start" }}>Add download</Button>
            {lists.downloads.map((item) => (
              <Stack key={item.id} direction="row" justifyContent="space-between" sx={{ p: 1, border: "1px solid #e2e8f0", borderRadius: 1.5 }}>
                <Typography>{item.title}</Typography>
                <Button size="small" color="error" onClick={() => removeRow(ENDPOINTS.websiteDownloads, item.id)}>Remove</Button>
              </Stack>
            ))}
          </Stack>
        ) : null}

        {tab === "inquiries" ? (
          <Stack spacing={1.2}>
            <Typography color="text.secondary">Public Contact form messages land here and in Messages. Reply emails the visitor.</Typography>
            {lists.inquiries.map((item) => (
              <Stack key={item.id} spacing={0.8} sx={{ p: 1.1, border: "1px solid #e2e8f0", borderRadius: 1.5 }}>
                <Typography sx={{ fontWeight: 800 }}>{item.name} · {item.email} · {item.status}</Typography>
                <Typography variant="body2">{item.subject}</Typography>
                <Typography variant="body2">{item.message}</Typography>
                {item.admin_reply ? <Typography variant="body2" color="text.secondary">Replied: {item.admin_reply}</Typography> : null}
                <TextField size="small" multiline minRows={2} label="Reply" value={reply[item.id] || ""} onChange={(e) => setReply((prev) => ({ ...prev, [item.id]: e.target.value }))} />
                <Button size="small" variant="contained" onClick={() => sendReply(item.id)} sx={{ alignSelf: "flex-start" }}>Send reply</Button>
              </Stack>
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
            <TextField size="small" label="Login path" value={form.login_path || "/login"} onChange={(e) => setField("login_path", e.target.value)} />
          </Stack>
        ) : null}
      </Stack>
    </ListingPage>
  );
};

export default WebsiteCmsPage;
