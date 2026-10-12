const labelReadableSx = {
  "& .MuiInputLabel-root": {
    maxWidth: "calc(100% - 10px)",
    overflow: "hidden",
    textOverflow: "clip",
    whiteSpace: "nowrap",
  },
  "& .MuiInputBase-input": {
    textOverflow: "clip",
  },
};

export const compactFieldSx = {
  minWidth: { xs: "47%", sm: 184 },
  flex: { xs: "1 1 47%", sm: "1 1 184px" },
  maxWidth: { sm: 240 },
  "& .MuiInputBase-root": { bgcolor: "#fff" },
  "& .MuiFormHelperText-root": { mx: 0.2, mt: 0.05, lineHeight: 1.1, minHeight: 0 },
  "& .MuiFormHelperText-root:empty": { display: "none", m: 0 },
  "& .MuiFormHelperText-root:not(.Mui-error)": { display: "none" },
  ...labelReadableSx,
};

export const compactMemberFieldSx = {
  minWidth: 168,
  flex: "0 1 288px",
  maxWidth: 288,
  "& .MuiInputBase-root": { bgcolor: "#fff", fontSize: "0.72rem" },
  "& .MuiInputBase-input": { fontSize: "0.72rem", py: 0.45 },
  "& .MuiInputLabel-root": { fontSize: "0.75rem" },
  "& .MuiChip-root": { height: 18, fontSize: "0.65rem" },
  "& .MuiChip-label": { px: 0.55 },
  "& .MuiFormHelperText-root": { mx: 0.2, mt: 0.05, lineHeight: 1.1, minHeight: 0 },
  "& .MuiFormHelperText-root:empty": { display: "none", m: 0 },
  "& .MuiFormHelperText-root:not(.Mui-error)": { display: "none" },
  ...labelReadableSx,
};

const formControlBase = {
  textTransform: "none",
  fontWeight: 700,
  px: 1.65,
  py: 0.75,
  fontSize: "0.8125rem",
  lineHeight: 1.2,
  minHeight: 40,
  borderRadius: "10px !important",
};

export const formActionButtonSx = {
  ...formControlBase,
  px: 2.25,
};

export const compactToggleButtonSx = {
  ...formControlBase,
  border: "1px solid #c5d4e8",
  bgcolor: "#fff",
  color: "#1e3a5f",
  "&.Mui-selected": {
    bgcolor: "var(--portal-primary)",
    color: "#fff",
    borderColor: "var(--portal-primary)",
    boxShadow: "0 1px 0 rgba(15, 23, 42, 0.1)",
    "&:hover": {
      bgcolor: "var(--portal-ink)",
      borderColor: "var(--portal-ink)",
    },
  },
  "&:hover": {
    bgcolor: "#f4f8ff",
    borderColor: "var(--portal-primary)",
  },
};

export const compactToggleGroupSx = {
  gap: "6px",
  "& .MuiToggleButtonGroup-grouped": {
    borderRadius: "10px !important",
    border: "1px solid #c5d4e8 !important",
    margin: "0 !important",
  },
  "& .MuiToggleButton-root": compactToggleButtonSx,
};

export const ruleToggleSx = (color) => ({
  ...compactToggleButtonSx,
  "&.Mui-selected": {
    bgcolor: color,
    color: "#fff",
    borderColor: color,
    boxShadow: "0 1px 0 rgba(15, 23, 42, 0.1)",
    "&:hover": { bgcolor: color, filter: "brightness(0.92)" },
  },
});

export const compactSelectSx = compactFieldSx;

export const compactFilterSx = {
  minWidth: { xs: "47%", sm: 150 },
  flex: { xs: "1 1 47%", sm: "1 1 150px" },
  maxWidth: { sm: 210 },
  "& .MuiFormHelperText-root": { display: "none" },
  ...labelReadableSx,
};

export const filterBarSx = {
  alignItems: "center",
  width: "100%",
  "& > .MuiTextField-root, & > .MuiFormControl-root": {
    minWidth: { xs: "47% !important", sm: "150px !important" },
    width: "auto !important",
    maxWidth: { sm: "210px !important" },
    flex: { xs: "1 1 47% !important", sm: "1 1 150px !important" },
  },
};
