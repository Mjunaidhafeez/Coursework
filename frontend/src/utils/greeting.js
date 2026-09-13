import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import NightsStayRoundedIcon from "@mui/icons-material/NightsStayRounded";
import WbSunnyRoundedIcon from "@mui/icons-material/WbSunnyRounded";

export const getTimeGreeting = (date = new Date()) => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) {
    return { label: "Good Morning", Icon: WbSunnyRoundedIcon };
  }
  if (hour >= 12 && hour < 16) {
    return { label: "Good Noon", Icon: LightModeRoundedIcon };
  }
  if (hour >= 16 && hour < 20) {
    return { label: "Good Evening", Icon: NightsStayRoundedIcon };
  }
  return { label: "Good Night", Icon: DarkModeRoundedIcon };
};
