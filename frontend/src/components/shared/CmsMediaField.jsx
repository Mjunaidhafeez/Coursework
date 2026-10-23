import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { Box, IconButton, Stack, Typography } from "@mui/material";

import MultiFilePicker from "./MultiFilePicker";

const isImageUrl = (url) => /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(url) || /\/image\/upload\//.test(url);

const CmsMediaField = ({
  urls = [],
  onUrls,
  accept = "image/*",
  multiple = true,
  label = "Choose files",
  busy = false,
  onPick,
}) => (
  <Stack spacing={0.8}>
    <MultiFilePicker accept={accept} label={busy ? "Uploading…" : label} disabled={busy} multiple={multiple} onChange={onPick} />
    {urls.length ? (
      <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
        {urls.map((url) => (
          <Box key={url} sx={{ position: "relative", width: 72 }}>
            {isImageUrl(url) ? (
              <Box component="img" src={url} alt="" sx={{ width: 72, height: 72, objectFit: "cover", borderRadius: 1, border: "1px solid #e2e8f0" }} />
            ) : (
              <Typography variant="caption" sx={{ display: "block", p: 0.5, border: "1px solid #e2e8f0", borderRadius: 1, wordBreak: "break-all" }}>
                {url.split("/").pop()}
              </Typography>
            )}
            <IconButton
              size="small"
              onClick={() => onUrls(urls.filter((item) => item !== url))}
              sx={{ position: "absolute", top: -8, right: -8, bgcolor: "#fff", boxShadow: 1, width: 22, height: 22 }}
            >
              <CloseRoundedIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        ))}
      </Stack>
    ) : null}
  </Stack>
);

export default CmsMediaField;
