import { Box, Button, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { useState } from "react";

import api from "../../api/client";
import PaginationControls from "../../components/PaginationControls";
import SearchToolbar from "../../components/shared/SearchToolbar";
import { useUi } from "../../context/UiContext";
import { ENDPOINTS } from "../../api/endpoints";
import usePaginatedQuery from "../../hooks/usePaginatedQuery";
import { confirmDelete } from "../../utils/confirm";

const SemestersPage = () => {
  const { notify } = useUi();
  const [number, setNumber] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [numberError, setNumberError] = useState("");

  const queryFn = async ({ search, page, pageSize }) => {
    const params = new URLSearchParams();
    params.append("ordering", "number");
    if (search) params.append("number", search);
    params.append("page", String(page));
    params.append("page_size", String(pageSize));
    const { data } = await api.get(`${ENDPOINTS.semesters}?${params.toString()}`);
    return data;
  };

  const { rows, total, search, setSearch, page, pageSize, runSearch, resetSearch, changePage, changePageSize, loadData } =
    usePaginatedQuery({ queryFn });

  const clearForm = () => {
    setEditingId(null);
    setNumber("");
    setNumberError("");
  };

  const submit = async () => {
    const parsed = Number(number);
    if (!parsed || parsed < 1 || parsed > 8) {
      setNumberError("Semester number must be between 1 and 8");
      notify("Semester number must be between 1 and 8", "error");
      return;
    }
    setNumberError("");

    try {
      if (editingId) {
        await api.patch(`${ENDPOINTS.semesters}${editingId}/`, { number: parsed });
        notify("Semester updated");
      } else {
        await api.post(ENDPOINTS.semesters, { number: parsed });
        notify("Semester added");
      }
      clearForm();
      await loadData();
    } catch {
      notify("Unable to save semester", "error");
    }
  };

  const createDefaults = async () => {
    try {
      const { data } = await api.post(`${ENDPOINTS.semesters}create_defaults/`);
      notify(`Semesters synced. New: ${data.created || 0}, Total: ${data.total || 0}`);
      await loadData();
    } catch {
      notify("Failed to generate default semesters", "error");
    }
  };

  const edit = (row) => {
    setEditingId(row.id);
    setNumber(String(row.number));
    setNumberError("");
  };

  const remove = async (id) => {
    if (!confirmDelete("semester")) {
      return;
    }
    try {
      await api.delete(`${ENDPOINTS.semesters}${id}/`);
      notify("Semester deleted");
      await loadData();
    } catch {
      notify("Delete failed", "error");
    }
  };

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" mb={2}>Semesters</Typography>
        <SearchToolbar label="Search semester number" search={search} onSearchChange={setSearch} onSearch={runSearch} onReset={resetSearch} />
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
          <TextField
            required
            size="small"
            label="Semester Number (1-8)"
            type="number"
            value={number}
            error={Boolean(numberError)}
            helperText={numberError}
            onChange={(e) => {
              setNumber(e.target.value);
              if (numberError) setNumberError("");
            }}
            inputProps={{ min: 1, max: 8 }}
            sx={{ maxWidth: 260 }}
          />
          <Button variant="contained" onClick={submit}>{editingId ? "Update" : "Add"}</Button>
          <Button variant="outlined" onClick={clearForm}>Clear</Button>
          <Box sx={{ flex: 1 }} />
          <Button variant="outlined" onClick={createDefaults}>Generate Default Semesters (1-8)</Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Semester</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.number}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button size="small" onClick={() => edit(item)}>Edit</Button>
                    <Button size="small" color="error" onClick={() => remove(item.id)}>Delete</Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Box sx={{ mt: 1.5 }}>
          <PaginationControls page={page} pageSize={pageSize} total={total} onPageChange={changePage} onPageSizeChange={changePageSize} />
        </Box>
      </Paper>
    </Stack>
  );
};

export default SemestersPage;
