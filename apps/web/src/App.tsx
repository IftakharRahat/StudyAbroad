import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ApplicationStrategyPage } from "./pages/ApplicationStrategyPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CountriesPage } from "./pages/CountriesPage";
import { DeadlinesPage } from "./pages/DeadlinesPage";
import { LoginPage } from "./pages/LoginPage";
import { MatchingPage } from "./pages/MatchingPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ReadinessPage } from "./pages/ReadinessPage";
import { RegisterPage } from "./pages/RegisterPage";
import { SavedScholarshipsPage } from "./pages/SavedScholarshipsPage";
import { ScholarshipDetailsPage } from "./pages/ScholarshipDetailsPage";
import { ScholarshipsPage } from "./pages/ScholarshipsPage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={(
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        )}
      >
        <Route index element={<DashboardPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="readiness" element={<ReadinessPage />} />
        <Route path="matches" element={<MatchingPage />} />
        <Route path="application-strategy" element={<ApplicationStrategyPage />} />
        <Route path="scholarships" element={<ScholarshipsPage />} />
        <Route path="scholarships/:scholarshipId" element={<ScholarshipDetailsPage />} />
        <Route path="saved" element={<SavedScholarshipsPage />} />
        <Route path="deadlines" element={<DeadlinesPage />} />
        <Route path="countries" element={<CountriesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
