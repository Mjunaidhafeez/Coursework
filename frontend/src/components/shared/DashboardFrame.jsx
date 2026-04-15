import { Paper, Tab, Tabs, Typography } from "@mui/material";

const DashboardFrame = ({ title, subtitle, tabs = [], activeTab, onTabChange }) => {
  return (
    <Paper
      sx={{
        p: 1.25,
        border: "1px solid #dbeafe",
        borderRadius: 2,
        background: "linear-gradient(130deg, #eff6ff 0%, #f8fbff 55%, #eef2ff 100%)",
      }}
    >
      <Typography className="premium-heading-soft" sx={{ fontWeight: 900, fontSize: "1.06rem" }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: "#3e4d73", mb: 1 }}>
        {subtitle}
      </Typography>
      <Tabs
        value={activeTab}
        onChange={(_event, value) => onTabChange(value)}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{
          minHeight: 34,
          "& .MuiTab-root": {
            minHeight: 34,
            py: 0.2,
            px: 1.1,
            textTransform: "none",
            fontWeight: 700,
            borderRadius: 1.2,
            mr: 0.7,
          },
          "& .MuiTabs-indicator": { display: "none" },
        }}
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.value}
            value={tab.value}
            label={tab.label}
            sx={{
              color: activeTab === tab.value ? "#0f3f93 !important" : "#4b5f8a",
              bgcolor: activeTab === tab.value ? "rgba(255,255,255,0.9)" : "transparent",
              border: activeTab === tab.value ? "1px solid #cfe0fb" : "1px solid transparent",
            }}
          />
        ))}
      </Tabs>
    </Paper>
  );
};

export default DashboardFrame;
