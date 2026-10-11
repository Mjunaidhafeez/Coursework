import { Avatar, Button, Stack, Typography } from "@mui/material";
import { useEffect, useMemo } from "react";

import { toAbsoluteMediaUrl } from "../../utils/mediaUrl";
import { getUserDisplayName } from "../../utils/userDisplay";

export const personAvatarSrc = (person) =>
  toAbsoluteMediaUrl(person?.avatar || person?.student_avatar || person?.photo_url || null);

export const personFallbackLetter = (person, role) => {
  const resolved = String(role || person?.role || "").toLowerCase();
  if (resolved === "student") return "S";
  if (resolved === "teacher") return "T";
  const name = getUserDisplayName(person) || person?.name || person?.student_name || "";
  return (name.trim().slice(0, 1) || "?").toUpperCase();
};

const PersonAvatar = ({ person, src, name, role, size = 32, sx }) => {
  const image = src !== undefined ? toAbsoluteMediaUrl(src) : personAvatarSrc(person);
  return (
    <Avatar
      src={image || undefined}
      sx={{
        width: size,
        height: size,
        bgcolor: "#1d4fbf",
        fontSize: size < 26 ? "0.68rem" : "0.78rem",
        fontWeight: 800,
        flexShrink: 0,
        ...sx,
      }}
    >
      {personFallbackLetter({ ...person, full_name: name || person?.full_name }, role)}
    </Avatar>
  );
};

export const PersonNameCell = ({ person, name, size = 30, role }) => (
  <Stack direction="row" spacing={0.8} alignItems="center" minWidth={0}>
    <PersonAvatar person={person} name={name} size={size} role={role} />
    <Typography noWrap sx={{ fontWeight: 700, fontSize: "0.82rem" }}>
      {name || getUserDisplayName(person) || person?.name || person?.student_name || "-"}
    </Typography>
  </Stack>
);

export const PersonPhotoField = ({ src, file, name, role, onChange, size = 40 }) => {
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : src || ""), [file, src]);
  useEffect(() => () => {
    if (file && preview) URL.revokeObjectURL(preview);
  }, [file, preview]);
  return (
    <Button component="label" sx={{ minWidth: 0, p: 0, borderRadius: "50%" }} title="Photo">
      <PersonAvatar src={preview} name={name} role={role} size={size} />
      <input hidden type="file" accept="image/*" onChange={(e) => onChange(e.target.files?.[0] || null)} />
    </Button>
  );
};

export default PersonAvatar;
