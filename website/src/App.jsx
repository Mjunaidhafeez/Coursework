import { Navigate, Route, Routes } from "react-router-dom";

import PageGuard from "./components/PageGuard";
import SiteLayout from "./layout/SiteLayout";
import AboutPage from "./pages/AboutPage";
import AdmissionsPage from "./pages/AdmissionsPage";
import AlumniPage from "./pages/AlumniPage";
import AnnouncementDetailPage from "./pages/AnnouncementDetailPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import ContactPage from "./pages/ContactPage";
import DownloadsPage from "./pages/DownloadsPage";
import GalleryPage from "./pages/GalleryPage";
import HomePage from "./pages/HomePage";
import ProgramsPage from "./pages/ProgramsPage";
import ResultsPage from "./pages/ResultsPage";
import SimpleCardsPage from "./pages/SimpleCardsPage";
import TeachersPage from "./pages/TeachersPage";
import VcPage from "./pages/VcPage";

const guarded = (pageKey, element) => <PageGuard pageKey={pageKey}>{element}</PageGuard>;

function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={guarded("home", <HomePage />)} />
        <Route path="/about" element={guarded("about", <AboutPage />)} />
        <Route path="/vc" element={guarded("vc", <VcPage />)} />
        <Route path="/programs" element={guarded("programs", <ProgramsPage />)} />
        <Route path="/admissions" element={guarded("admissions", <AdmissionsPage />)} />
        <Route path="/teachers" element={guarded("teachers", <TeachersPage />)} />
        <Route path="/alumni" element={guarded("alumni", <AlumniPage />)} />
        <Route path="/results" element={guarded("results", <ResultsPage />)} />
        <Route path="/campus" element={guarded("campus", <SimpleCardsPage pageKey="campus" kicker="Campus" />)} />
        <Route path="/scholarships" element={guarded("scholarships", <SimpleCardsPage pageKey="scholarships" kicker="Support" />)} />
        <Route path="/why" element={guarded("why", <SimpleCardsPage pageKey="why" kicker="Why us" />)} />
        <Route path="/announcements" element={guarded("announcements", <AnnouncementsPage />)} />
        <Route path="/announcements/:id" element={guarded("announcements", <AnnouncementDetailPage />)} />
        <Route path="/gallery" element={guarded("gallery", <GalleryPage />)} />
        <Route path="/downloads" element={guarded("downloads", <DownloadsPage />)} />
        <Route path="/contact" element={guarded("contact", <ContactPage />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
