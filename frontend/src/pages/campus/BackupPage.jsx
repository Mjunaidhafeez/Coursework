import CloudDownloadRoundedIcon from "@mui/icons-material/CloudDownloadRounded";
import { Button, Stack, Typography } from "@mui/material";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import ListingPage from "../../components/shared/ListingPage";
import { useUi } from "../../context/UiContext";

const BackupPage = () => {
  const { notify } = useUi();

  const download = async () => {
    try {
      const res = await api.get(ENDPOINTS.campusBackup, { responseType: "blob" });
      const url = window.URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "portal-backup.json";
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      notify("Could not export backup", "error");
    }
  };

  return (
    <ListingPage title="Backup export" icon={<CloudDownloadRoundedIcon />} subtitle="Download users, courses, enrollments, and assessments as JSON">
      <Stack spacing={1.2}>
        <Typography color="text.secondary">Use this file as a snapshot. It does not include uploaded study files.</Typography>
        <Button variant="contained" onClick={download} sx={{ alignSelf: "flex-start" }}>Download JSON</Button>
      </Stack>
    </ListingPage>
  );
};

export default BackupPage;
