import { Button } from "@mui/material";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import { useUi } from "../../context/UiContext";
import { extractApiErrorMessage } from "../../utils/apiErrors";
import { postGroupDecision } from "../../utils/groupForm";

const GroupReviewActions = ({ group, onDone }) => {
  const { notify } = useUi();
  if (String(group?.status || "") !== "pending") return null;

  const decide = async (decision) => {
    try {
      await postGroupDecision(api, ENDPOINTS, group.id, decision);
      notify(decision === "approve" ? "Group request approved" : "Group request rejected");
      await onDone?.();
    } catch (err) {
      notify(extractApiErrorMessage(err), "error");
    }
  };

  return (
    <>
      <Button size="small" color="success" onClick={() => decide("approve")}>Approve</Button>
      <Button size="small" color="warning" onClick={() => decide("reject")}>Reject</Button>
    </>
  );
};

export default GroupReviewActions;
