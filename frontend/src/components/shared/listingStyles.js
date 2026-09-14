export const compactFieldSx = {
  minWidth: { xs: "100%", sm: 148 },
  flex: { xs: "1 1 100%", sm: "1 1 148px" },
  "& .MuiFormHelperText-root": { mx: 0.2, mt: 0.15, lineHeight: 1.2 },
};

export const compactSelectSx = {
  ...compactFieldSx,
  maxWidth: { md: 220 },
};
