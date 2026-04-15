import { Box } from "@mui/material";

import StatCard from "../StatCard";

const DashboardMetricGrid = ({ metrics = [], columns = { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" } }) => {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 1.2,
        gridTemplateColumns: columns,
      }}
    >
      {metrics.map((metric) => (
        <Box key={metric.label}>
          <StatCard
            label={metric.label}
            value={metric.value}
            accent={metric.accent}
            valueFontSize={metric.valueFontSize}
          />
        </Box>
      ))}
    </Box>
  );
};

export default DashboardMetricGrid;
