import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import { useUi } from "../../context/UiContext";
import { extractApiErrorMessage } from "../../utils/apiErrors";
import { TOPIC_SOURCE_TEACHER_GROUP, topicSourceLabel } from "../../utils/courseworkForm";
import { PersonNameCell } from "./PersonAvatar";

const TopicAllotDialog = ({ coursework, onClose, onSaved }) => {
  const { notify } = useUi();
  const [targets, setTargets] = useState([]);
  const [topics, setTopics] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const open = Boolean(coursework?.id);
  const perGroup = coursework?.topic_source === TOPIC_SOURCE_TEACHER_GROUP;

  const filledCount = useMemo(
    () => Object.values(topics).filter((value) => String(value || "").trim()).length,
    [topics]
  );

  useEffect(() => {
    if (!open) {
      setTargets([]);
      setTopics({});
      setError("");
      return undefined;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get(`${ENDPOINTS.courseworks}${coursework.id}/topic_targets/`);
        if (cancelled) return;
        const rows = data?.targets || [];
        setTargets(rows);
        setTopics(Object.fromEntries(rows.map((row) => [String(row.id), row.topic || ""])));
      } catch (err) {
        if (!cancelled) {
          setError(extractApiErrorMessage(err) || "Could not load students or groups.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, coursework?.id]);

  const save = async () => {
    const assignments = targets
      .map((row) => ({ id: row.id, topic: String(topics[String(row.id)] || "").trim() }))
      .filter((row) => row.topic);
    if (!assignments.length) {
      setError("Enter at least one topic.");
      return;
    }
    const seen = new Set();
    for (const row of assignments) {
      const key = row.topic.toLowerCase();
      if (seen.has(key)) {
        setError(`Topic "${row.topic}" is used more than once. Each ${perGroup ? "group" : "student"} needs a unique topic.`);
        return;
      }
      seen.add(key);
    }
    setSaving(true);
    setError("");
    try {
      await api.post(`${ENDPOINTS.courseworks}${coursework.id}/allot_topics/`, { assignments });
      notify(`Topics allotted for ${assignments.length} ${perGroup ? "group(s)" : "student(s)"}`);
      onSaved?.();
      onClose();
    } catch (err) {
      setError(extractApiErrorMessage(err) || "Could not allot topics.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 0.6 }}>
        Allot topics — {coursework?.title || "Assessment"}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.1}>
          <Typography variant="body2" color="text.secondary">
            {topicSourceLabel(coursework?.topic_source)}. Each {perGroup ? "group" : "student"} gets a different topic.
            You can save now and finish the rest later.
          </Typography>
          <Chip
            size="small"
            variant="outlined"
            label={loading ? "Loading…" : `${filledCount} of ${targets.length} topics entered`}
            sx={{ alignSelf: "flex-start" }}
          />
          {error ? <Alert severity="error">{error}</Alert> : null}
          {!loading && !targets.length && !error ? (
            <Alert severity="info">
              {perGroup
                ? "No approved groups found for this course yet. Approve groups first, then allot topics."
                : "No students found for this course yet."}
            </Alert>
          ) : null}
          {targets.map((row) => (
            <Stack key={row.id} spacing={0.3}>
              <Stack direction="row" spacing={0.8} alignItems="center">
                <PersonNameCell person={row} name={row.name} size={28} />
                {row.roll_no ? (
                  <Typography variant="caption" color="text.secondary">
                    {row.roll_no}
                  </Typography>
                ) : null}
              </Stack>
              {perGroup && row.members?.length ? (
                <Typography variant="caption" color="text.secondary">
                  {row.members.map((member) => member.name).join(", ")}
                </Typography>
              ) : null}
              <TextField
                size="small"
                label="Topic"
                value={topics[String(row.id)] || ""}
                onChange={(e) => setTopics((prev) => ({ ...prev, [String(row.id)]: e.target.value }))}
                placeholder={perGroup ? "Topic for this group" : "Topic for this student"}
              />
            </Stack>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Later
        </Button>
        <Button variant="contained" onClick={save} disabled={saving || loading || !targets.length}>
          Save topics
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TopicAllotDialog;
