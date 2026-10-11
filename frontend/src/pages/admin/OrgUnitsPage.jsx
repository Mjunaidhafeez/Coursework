import { Button, Checkbox, MenuItem, Stack, Tab, Tabs, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
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
import BulkActionBar from "../../components/shared/BulkActionBar";
import useRowSelection from "../../hooks/useRowSelection";
import { postBulkUpdate, runBulkDelete } from "../../utils/bulkApi";
import { confirmDelete } from "../../utils/confirm";
import { fetchOrgCatalog } from "../campus/listRows";

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
  const [filters, setFilters] = useState({ department: "", school_class: "" });
  const [bulkValue, setBulkValue] = useState("");
  const selection = useRowSelection();
  const current = TABS.find((item) => item.key === tab) || TABS[0];

  const queryFn = async ({ search, page, pageSize }) => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (tab === "classes" && filters.department) params.append("department", filters.department);
    if (tab === "sections" && filters.school_class) params.append("school_class", filters.school_class);
    params.append("page", String(page));
    params.append("page_size", String(pageSize));
    const { data } = await api.get(`${current.endpoint}?${params.toString()}`);
    return data;
  };

  const { rows, total, search, setSearch, page, pageSize, runSearch, resetSearch, changePage, changePageSize, loadData } =
    usePaginatedQuery({ queryFn, dependencies: [tab, filters.department, filters.school_class] });

  const loadCatalogs = async () => {
    const catalog = await fetchOrgCatalog(api, ENDPOINTS);
    setDepartments(catalog.departments);
    setClasses(catalog.classes);
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

  const handleBulkDelete = async () => {
    try {
      const result = await runBulkDelete({ endpoint: current.endpoint, ids: selection.selectedIds, label: current.label.toLowerCase() });
      if (!result.ok) return;
      notify("Selected items deleted");
      selection.clear();
      await loadData();
    } catch {
      notify("Bulk delete failed", "error");
    }
  };

  const handleBulkUpdate = async () => {
    const fields = tab === "classes" ? { department: bulkValue } : { school_class: bulkValue };
    if (!bulkValue) {
      notify("Choose a value to update", "error");
      return;
    }
    try {
      const { data } = await postBulkUpdate(current.endpoint, selection.selectedIds, fields);
      notify(`Updated ${data.updated_count || 0} items`);
      selection.clear();
      setBulkValue("");
      await loadData();
    } catch {
      notify("Bulk update failed", "error");
    }
  };

  return (
    <ListingPage
      title="Classes & Departments"
      subtitle="Set up departments, classes and sections once. Teachers and students then pick them on their forms, and the website can filter the same data."
      tabs={(
        <Tabs value={tab} onChange={(_, value) => { setTab(value); clearForm(); selection.clear(); setBulkValue(""); setFilters({ department: "", school_class: "" }); }} sx={{ minHeight: 36, "& .MuiTab-root": { minHeight: 36, textTransform: "none", fontWeight: 700 } }}>
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
      filters={(
        <SearchToolbar
          search={search}
          onSearchChange={setSearch}
          onSearch={runSearch}
          onReset={() => { setFilters({ department: "", school_class: "" }); resetSearch(); }}
          filters={tab === "classes" || tab === "sections" ? (
            <>
              {tab === "classes" ? (
                <TextField size="small" select label="Department" value={filters.department} sx={{ minWidth: 150 }} onChange={(e) => setFilters((prev) => ({ ...prev, department: e.target.value }))}>
                  <MenuItem value="">All</MenuItem>
                  {departments.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
                </TextField>
              ) : (
                <TextField size="small" select label="Class" value={filters.school_class} sx={{ minWidth: 150 }} onChange={(e) => setFilters((prev) => ({ ...prev, school_class: e.target.value }))}>
                  <MenuItem value="">All</MenuItem>
                  {classes.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
                </TextField>
              )}
            </>
          ) : null}
        />
      )}
    >
      <BulkActionBar
        count={selection.count}
        onClear={selection.clear}
        onDelete={handleBulkDelete}
        updateSlot={tab === "classes" || tab === "sections" ? (
          <>
            <TextField size="small" select label={tab === "classes" ? "Department" : "Class"} value={bulkValue} sx={{ minWidth: 140 }} onChange={(e) => setBulkValue(e.target.value)}>
              <MenuItem value="">Keep</MenuItem>
              {(tab === "classes" ? departments : classes).map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
            </TextField>
            <Button size="small" variant="contained" onClick={handleBulkUpdate}>Update selected</Button>
          </>
        ) : null}
      />
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox size="small" checked={selection.allChecked(rows.map((item) => item.id))} onChange={() => selection.toggleAll(rows.map((item) => item.id))} />
            </TableCell>
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
              <TableCell padding="checkbox">
                <Checkbox size="small" checked={selection.isSelected(row.id)} onChange={() => selection.toggle(row.id)} />
              </TableCell>
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
