import { Alert } from "@mui/material";

const normalizeErrors = (errors) => {
  if (!errors || typeof errors !== "object") return [];
  const values = Object.values(errors)
    .map((value) => (Array.isArray(value) ? value[0] : value))
    .filter(Boolean)
    .map((value) => String(value));
  return [...new Set(values)];
};

const FormErrorSummary = ({ errors, title = "Please fix the following errors:" }) => {
  const items = normalizeErrors(errors);
  if (!items.length) return null;

  return (
    <Alert
      severity="error"
      sx={{
        mb: 1.2,
        borderRadius: 1.6,
        border: "1px solid #fecaca",
        bgcolor: "#fff6f6",
      }}
    >
      <strong>{title}</strong>
      <ul style={{ margin: "8px 0 0 18px", padding: 0 }}>
        {items.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </Alert>
  );
};

export default FormErrorSummary;
