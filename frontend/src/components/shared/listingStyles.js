export const compactFieldSx = {
  minWidth: { xs: "47%", sm: 112 },
  flex: { xs: "1 1 47%", sm: "1 1 0" },
  "& .MuiInputBase-root": { bgcolor: "#fff" },
  "& .MuiFormHelperText-root": { mx: 0.2, mt: 0.05, lineHeight: 1.1, minHeight: 0 },
  "& .MuiFormHelperText-root:empty": { display: "none", m: 0 },
  "& .MuiFormHelperText-root:not(.Mui-error)": { display: "none" },
};

export const compactSelectSx = compactFieldSx;

export const compactFilterSx = {
  minWidth: { xs: "47%", sm: 108 },
  flex: { xs: "1 1 47%", sm: "1 1 0" },
  "& .MuiFormHelperText-root": { display: "none" },
};

export const filterBarSx = {
  alignItems: "center",
  width: "100%",
  "& > .MuiTextField-root, & > .MuiFormControl-root": {
    minWidth: { xs: "47% !important", sm: "108px !important" },
    width: "auto !important",
    maxWidth: "none !important",
    flex: { xs: "1 1 47% !important", sm: "1 1 0 !important" },
  },
};
