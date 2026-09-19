import { Navigate, Route, Routes } from "react-router-dom";

import SiteLayout from "./layout/SiteLayout";
import AboutPage from "./pages/AboutPage";
import AdmissionsPage from "./pages/AdmissionsPage";
import AnnouncementDetailPage from "./pages/AnnouncementDetailPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import DownloadsPage from "./pages/DownloadsPage";
import GalleryPage from "./pages/GalleryPage";
import HomePage from "./pages/HomePage";
import ProgramsPage from "./pages/ProgramsPage";
import VcPage from "./pages/VcPage";

function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/vc" element={<VcPage />} />
        <Route path="/programs" element={<ProgramsPage />} />
        <Route path="/admissions" element={<AdmissionsPage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
        <Route path="/announcements/:id" element={<AnnouncementDetailPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/downloads" element={<DownloadsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
