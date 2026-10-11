import { Button, MenuItem, Stack, Tab, Tabs, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import PaginationControls from "../../components/PaginationControls";
import CompactAddForm from "../../components/shared/CompactAddForm";
import ListingPage from "../../components/shared/ListingPage";
import SearchToolbar from "../../components/shared/SearchToolbar";
import { compactFieldSx } from "../../components/shared/listingStyles";
import { useUi } from "../../context/UiContext";
import usePaginatedQuery from "../../hooks/usePaginatedQuery";
import { confirmDelete } from "../../utils/confirm";
import { listRows } from "../campus/listRows";

const TABS = [
  { key: "departments", label: "Departments", endpoint: ENDPOINTS.departments },
  { key: "classes", label: "Classes", endpoint: ENDPOINTS.schoolClasses },
  { key: "sections", label: "Sections", endpoint: ENDPOINTS.sections },
];

const emptyForm = { name: "", code: "", department: "", school_class: "" };

const OrgUnitsPage = () => {
  const { notify } = useUi();
  const [tab, setTab] = useState("departments");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const current = TABS.find((item) => item.key === tab) || TABS[0];

  const queryFn = async ({ search, page, pageSize }) => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    params.append("page", String(page));
    params.append("page_size", String(pageSize));
    const { data } = await api.get(`${current.endpoint}?${params.toString()}`);
    return data;
  };

  const { rows, total, search, setSearch, page, pageSize, runSearch, resetSearch, changePage, changePageSize, loadData } =
    usePaginatedQuery({ queryFn, dependencies: [tab] });

  const loadCatalogs = async () => {
    const [deptRes, classRes] = await Promise.all([
      api.get(`${ENDPOINTS.departments}?page_size=200`),
      api.get(`${ENDPOINTS.schoolClasses}?page_size=200`),
    ]);
    setDepartments(listRows(deptRes.data));
    setClasses(listRows(classRes.data));
  };

  useEffect(() => {
    loadCatalogs().catch(() => notify("Could not load class catalog", "error"));
  }, []);

  const classOptions = useMemo(
    () => (form.department ? classes.filter((item) => String(item.department || "") === String(form.department)) : classes),
    [classes, form.department]
  );

  const clearForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const submit = async () => {
    if (!form.name.trim()) {
      notify("Name is required", "error");
      return;
    }
    if (tab === "classes" && !form.department) {
      notify("Department is required for a class", "error");
      return;
    }
    if (tab === "sections" && !form.school_class) {
      notify("Class is required for a section", "error");
      return;
    }
    const payload =
      tab === "departments"
        ? { name: form.name.trim(), code: form.code.trim() }
        : tab === "classes"
          ? { name: form.name.trim(), department: form.department || null }
          : { name: form.name.trim(), school_class: form.school_class };
    try {
      if (editingId) {
        await api.patch(`${current.endpoint}${editingId}/`, payload);
        notify("Updated");
      } else {
        await api.post(current.endpoint, payload);
        notify("Added");
      }
      clearForm();
      await loadData();
      await loadCatalogs();
    } catch {
      notify("Could not save", "error");
    }
  };

  const edit = (row) => {
    setEditingId(row.id);
    setForm({
      name: row.name || "",
      code: row.code || "",
      department: row.department || "",
      school_class: row.school_class || "",
    });
  };

  const remove = async (id) => {
    if (!confirmDelete(tab === "departments" ? "department" : tab === "classes" ? "class" : "section")) return;
    try {
      await api.delete(`${current.endpoint}${id}/`);
      notify("Deleted");
      await loadData();
    } catch {
      notify("Delete failed", "error");
    }
  };

  return (
    <ListingPage
      title="Classes & Departments"
      subtitle="Set up departments, classes and sections once. Teachers and students then pick them on their forms, and the website can filter the same data."
      tabs={(
        <Tabs value={tab} onChange={(_, value) => { setTab(value); clearForm(); }} sx={{ minHeight: 36, "& .MuiTab-root": { minHeight: 36, textTransform: "none", fontWeight: 700 } }}>
          {TABS.map((item) => <Tab key={item.key} value={item.key} label={item.label} />)}
        </Tabs>
      )}
      addForm={(
        <CompactAddForm title={editingId ? `Update ${current.label.slice(0, -1)}` : `Add ${current.label.slice(0, -1)}`} submitLabel={editingId ? "Update" : "Add"} onSubmit={submit} onClear={clearForm}>
          <TextField required size="small" label="Name" value={form.name} sx={compactFieldSx} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
          {tab === "departments" ? (
            <TextField size="small" label="Code" value={form.code} sx={compactFieldSx} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))} />
          ) : null}
          {tab === "classes" ? (
            <TextField required select size="small" label="Department" value={form.department} sx={compactFieldSx} onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}>
              {departments.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
            </TextField>
          ) : null}
          {tab === "sections" ? (
            <TextField required select size="small" label="Class" value={form.school_class} sx={compactFieldSx} onChange={(e) => setForm((prev) => ({ ...prev, school_class: e.target.value }))}>
              {classOptions.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}{item.department_name ? ` · ${item.department_name}` : ""}</MenuItem>)}
            </TextField>
          ) : null}
        </CompactAddForm>
      )}
      filters={<SearchToolbar search={search} onSearchChange={setSearch} onSearch={runSearch} onReset={resetSearch} />}
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            {tab === "departments" ? <TableCell>Code</TableCell> : null}
            {tab === "classes" ? <TableCell>Department</TableCell> : null}
            {tab === "sections" ? <TableCell>Class</TableCell> : null}
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.name}</TableCell>
              {tab === "departments" ? <TableCell>{row.code || "-"}</TableCell> : null}
              {tab === "classes" ? <TableCell>{row.department_name || "-"}</TableCell> : null}
              {tab === "sections" ? <TableCell>{row.school_class_name || "-"}</TableCell> : null}
              <TableCell align="right">
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button size="small" onClick={() => edit(row)}>Edit</Button>
                  <Button size="small" color="error" onClick={() => remove(row.id)}>Delete</Button>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
          {!rows.length ? (
            <TableRow>
              <TableCell colSpan={4}><Typography variant="body2" color="text.secondary">No {current.label.toLowerCase()} yet.</Typography></TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
      <PaginationControls page={page} pageSize={pageSize} total={total} onPageChange={changePage} onPageSizeChange={changePageSize} />
    </ListingPage>
  );
};

export default OrgUnitsPage;
