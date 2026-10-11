import { Alert } from "@mui/material";

const normalizeErrors = (errors) => {
  if (!errors || typeof errors !== "object") return [];
  const values = Object.values(errors)
    .map((value) => (Array.isArray(value) ? value[0] : value))
    .filter(Boolean)
    .map((value) => String(value));
  return [...new Set(values)];
};

const FormErrorSummary = ({ errors }) => {
  const items = normalizeErrors(errors);
  if (!items.length) return null;

  return (
    <Alert severity="error" sx={{ py: 0.2, mb: 0.5, "& .MuiAlert-message": { py: 0, fontSize: "0.78rem" } }}>
      {items.join(" · ")}
    </Alert>
  );
};

export default FormErrorSummary;
