import { Avatar, Button, Stack, Typography } from "@mui/material";
import { useEffect, useMemo } from "react";

import { toAbsoluteMediaUrl } from "../../utils/mediaUrl";
import { getUserDisplayName } from "../../utils/userDisplay";

export const personAvatarSrc = (person) =>
  toAbsoluteMediaUrl(person?.avatar || person?.student_avatar || person?.photo_url || null);

export const personFallbackLetter = (person, name) => {
  const first = (person?.first_name || "").trim();
  const last = (person?.last_name || "").trim();
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  const label = name || getUserDisplayName(person) || person?.name || person?.student_name || "";
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return (parts[0]?.[0] || "?").toUpperCase();
};

const PersonAvatar = ({ person, src, name, size = 32, sx }) => {
  const image = src !== undefined ? toAbsoluteMediaUrl(src) : personAvatarSrc(person);
  return (
    <Avatar
      src={image || undefined}
      alt={name || getUserDisplayName(person) || "Photo"}
      sx={{
        width: size,
        height: size,
        bgcolor: "#1d4fbf",
        fontSize: size < 26 ? "0.62rem" : "0.72rem",
        fontWeight: 800,
        flexShrink: 0,
        ...sx,
      }}
    >
      {personFallbackLetter(person, name)}
    </Avatar>
  );
};

export const PersonNameCell = ({ person, name, size = 30 }) => (
  <Stack direction="row" spacing={0.8} alignItems="center" minWidth={0}>
    <PersonAvatar person={person} name={name} size={size} />
    <Typography noWrap sx={{ fontWeight: 700, fontSize: "0.82rem" }}>
      {name || getUserDisplayName(person) || person?.name || person?.student_name || "-"}
    </Typography>
  </Stack>
);

export const PersonPhotoField = ({ src, file, name, onChange, size = 40 }) => {
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : src || ""), [file, src]);
  useEffect(() => () => {
    if (file && preview) URL.revokeObjectURL(preview);
  }, [file, preview]);
  return (
    <Button component="label" sx={{ minWidth: 0, p: 0, borderRadius: "50%" }} title="Photo">
      <PersonAvatar src={preview} name={name} size={size} />
      <input hidden type="file" accept="image/*" onChange={(e) => onChange(e.target.files?.[0] || null)} />
    </Button>
  );
};

export default PersonAvatar;
