import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";

import StudentMemberList from "./StudentMemberList";

const MemberPreviewDialog = ({ open, groupName, members = [], onClose }) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle sx={{ pb: 0.6 }}>Members - {groupName}</DialogTitle>
    <DialogContent dividers>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.8 }}>
        Total members: {members.length || 0}
      </Typography>
      <StudentMemberList members={members} />
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Close</Button>
    </DialogActions>
  </Dialog>
);

export default MemberPreviewDialog;
