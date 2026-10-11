import RestoreFromTrashRoundedIcon from "@mui/icons-material/RestoreFromTrashRounded";
import { Button, Checkbox, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import BulkActionBar from "../../components/shared/BulkActionBar";
import ListingPage from "../../components/shared/ListingPage";
import { useUi } from "../../context/UiContext";
import useRowSelection from "../../hooks/useRowSelection";
import { extractApiErrorMessage } from "../../utils/apiErrors";
import { confirmPermanentDelete } from "../../utils/confirm";

const userLabel = (item) => {
  const name = (item.name || "").trim();
  const username = item.username || `#${item.id}`;
  return name && name !== username ? `${name} · ${username} (${item.role})` : `${username} (${item.role})`;
};

const RecycleSection = ({
  title,
  items,
  emptyText,
  selection,
  itemLabel,
  singular,
  plural,
  idField,
  restore,
  purge,
}) => {
  const ids = items.map((item) => item.id);
  const allOn = selection.allChecked(ids);
  const someOn = ids.some((id) => selection.isSelected(id));
  const one = (id) => ({ [`${idField}_id`]: id });
  const many = (list) => ({ [`${idField}_ids`]: list });

  return (
    <Stack spacing={0.8}>
      <Stack direction="row" spacing={0.6} alignItems="center" useFlexGap flexWrap="wrap">
        <Checkbox
          size="small"
          checked={allOn}
          indeterminate={someOn && !allOn}
          disabled={!ids.length}
          onChange={() => selection.toggleAll(ids)}
        />
        <Typography sx={{ fontWeight: 800 }}>{title}</Typography>
        <Button size="small" disabled={!ids.length} onClick={() => selection.toggleAll(ids)}>
          {allOn ? "Clear all" : "Select all"}
        </Button>
      </Stack>
      <BulkActionBar
        count={selection.count}
        onClear={selection.clear}
        onDelete={() => purge(many(selection.selectedIds), plural, selection.count)}
        deleteLabel="Delete permanently"
        updateSlot={(
          <Button size="small" color="success" variant="contained" onClick={() => restore(many(selection.selectedIds), `Selected ${plural} restored`)}>
            Restore selected
          </Button>
        )}
      />
      {items.map((item) => (
        <Stack key={item.id} direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1, border: "1px solid #e2e8f0", borderRadius: 1.5 }}>
          <Stack direction="row" spacing={0.6} alignItems="center" minWidth={0}>
            <Checkbox size="small" checked={selection.isSelected(item.id)} onChange={() => selection.toggle(item.id)} />
            <Typography>{itemLabel(item)}</Typography>
          </Stack>
          <Stack direction="row" spacing={0.6}>
            <Button size="small" onClick={() => restore(one(item.id), `${singular[0].toUpperCase()}${singular.slice(1)} restored`)}>Restore</Button>
            <Button size="small" color="error" onClick={() => purge(one(item.id), singular)}>Delete permanently</Button>
          </Stack>
        </Stack>
      ))}
      {!items.length ? <Typography variant="body2" color="text.secondary">{emptyText}</Typography> : null}
    </Stack>
  );
};

const RecycleBinPage = () => {
  const { notify } = useUi();
  const [data, setData] = useState({ users: [], notices: [] });
  const usersSel = useRowSelection();
  const noticesSel = useRowSelection();

  const load = async () => {
    const { data: payload } = await api.get(ENDPOINTS.campusRecycle);
    setData(payload);
  };

  useEffect(() => {
    load().catch(() => notify("Could not load recycle bin", "error"));
  }, []);

  const restore = async (payload, message) => {
    try {
      await api.post(ENDPOINTS.campusRecycle, { action: "restore", ...payload });
      notify(message);
      usersSel.clear();
      noticesSel.clear();
      await load();
    } catch (error) {
      notify(extractApiErrorMessage(error, "Could not restore"), "error");
    }
  };

  const purge = async (payload, entityLabel, count = 1) => {
    if (!confirmPermanentDelete(entityLabel, count)) return;
    try {
      await api.post(ENDPOINTS.campusRecycle, { action: "purge", ...payload });
      notify(
        payload.user_id || payload.user_ids?.length
          ? "Permanently deleted. Username and roll no can be used again."
          : "Permanently deleted."
      );
      usersSel.clear();
      noticesSel.clear();
      await load();
    } catch (error) {
      notify(extractApiErrorMessage(error, "Could not permanently delete"), "error");
    }
  };

  return (
    <ListingPage title="Recycle bin" icon={<RestoreFromTrashRoundedIcon />} subtitle="Restore or permanently delete deactivated users and notices">
      <Stack spacing={1.6}>
        <RecycleSection
          title="Users"
          items={data.users || []}
          emptyText="No deactivated users."
          selection={usersSel}
          itemLabel={userLabel}
          singular="user"
          plural="users"
          idField="user"
          restore={restore}
          purge={purge}
        />
        <RecycleSection
          title="Notices"
          items={data.notices || []}
          emptyText="No deleted notices."
          selection={noticesSel}
          itemLabel={(item) => item.title}
          singular="notice"
          plural="notices"
          idField="notice"
          restore={restore}
          purge={purge}
        />
      </Stack>
    </ListingPage>
  );
};

export default RecycleBinPage;
