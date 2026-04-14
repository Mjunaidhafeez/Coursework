export const GROUP_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export const getGroupStatusColor = (status) => {
  if (status === "approved") return "success";
  if (status === "rejected") return "error";
  return "warning";
};
