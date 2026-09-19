import { Box, Stack, Typography } from "@mui/material";

export const COMMS = {
  navy: "var(--portal-navy)",
  ink: "var(--portal-ink)",
  line: "#d7e4f8",
  wash: "#f5f8fd",
  muted: "#64748b",
  email: "var(--portal-primary)",
  chat: "var(--portal-primary)",
  whatsapp: "#0f766e",
};

export const commsCardSx = {
  border: `1px solid ${COMMS.line}`,
  borderRadius: 2,
  bgcolor: "#fff",
  overflow: "hidden",
};

export const CommsSection = ({ icon, title, subtitle, action, accent = COMMS.ink, children, sx }) => (
  <Box sx={{ ...commsCardSx, ...sx }}>
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      justifyContent="space-between"
      sx={{ px: 1.2, py: 0.85, bgcolor: COMMS.wash, borderBottom: `1px solid ${COMMS.line}` }}
    >
      <Stack direction="row" spacing={0.9} alignItems="center" minWidth={0}>
        {icon ? (
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: 1.2,
              display: "grid",
              placeItems: "center",
              bgcolor: `${accent}14`,
              color: accent,
              flexShrink: 0,
              "& svg": { fontSize: 16 },
            }}
          >
            {icon}
          </Box>
        ) : null}
        <Box minWidth={0}>
          <Typography sx={{ fontWeight: 800, fontSize: 13, color: COMMS.ink, lineHeight: 1.2 }}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography sx={{ fontSize: 11, color: COMMS.muted, lineHeight: 1.25 }} noWrap>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
      </Stack>
      {action}
    </Stack>
    <Box sx={{ p: 1.15 }}>{children}</Box>
  </Box>
);

export const initialsFrom = (value) => {
  const words = String(value || "Chat")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "C";
  return words.slice(0, 2).map((word) => word[0].toUpperCase()).join("");
};

export const formatWhen = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
};

export const formatWhenShort = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};
