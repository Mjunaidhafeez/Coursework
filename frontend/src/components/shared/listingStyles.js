export const compactFieldSx = {
  minWidth: { xs: "47%", sm: 132 },
  width: { sm: 156 },
  flex: { xs: "1 1 47%", sm: "0 0 156px" },
  maxWidth: { xs: "100%", sm: 200 },
  transition: "transform 140ms ease",
  "& .MuiFormHelperText-root": { mx: 0.2, mt: 0.1, lineHeight: 1.15, minHeight: 0 },
  "& .MuiFormHelperText-root:empty": { display: "none", m: 0 },
  "&:focus-within": { transform: "translateY(-1px)" },
};

export const compactSelectSx = {
  ...compactFieldSx,
  maxWidth: { xs: "100%", sm: 180 },
};

export const compactFilterSx = {
  minWidth: { xs: "47%", sm: 118 },
  width: { sm: 136 },
  flex: { xs: "1 1 47%", sm: "0 0 136px" },
  maxWidth: { xs: "100%", sm: 168 },
  "& .MuiFormHelperText-root": { display: "none" },
};

export const filterBarSx = {
  alignItems: "center",
  "& > .MuiTextField-root, & > .MuiFormControl-root": {
    minWidth: { xs: "47% !important", sm: "118px !important" },
    width: { sm: "136px !important" },
    maxWidth: { xs: "100% !important", sm: "168px !important" },
    flex: { xs: "1 1 47% !important", sm: "0 0 136px !important" },
  },
  "& > .MuiTextField-root:first-of-type": {
    minWidth: { xs: "47% !important", sm: "160px !important" },
    width: { sm: "176px !important" },
    maxWidth: { xs: "100% !important", sm: "200px !important" },
    flex: { xs: "1 1 47% !important", sm: "0 0 176px !important" },
  },
};
