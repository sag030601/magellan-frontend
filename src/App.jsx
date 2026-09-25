import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import PrincipalModuleRoute from "./components/PrincipalModuleRoute";
import AdminLayout from "./layouts/AdminLayout";

const Login = lazy(() => import("./pages/Login"));
const HomePage = lazy(() => import("./pages/Home"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const Candidates = lazy(() => import("./pages/Candidates"));
const CandidateDetails = lazy(() => import("./pages/CandidateDetails"));
const Owners = lazy(() => import("./pages/Owners"));
const Vessels = lazy(() => import("./pages/Vessels"));
const SignOnSignOffReport = lazy(() => import("./pages/SignOnSignOffReport"));
const DocumentReport = lazy(() => import("./pages/DocumentReport"));
const Users = lazy(() => import("./pages/Users"));
const MasterData = lazy(() => import("./pages/MasterData"));
const OwnerForm = lazy(() => import("./pages/OwnerForm"));
const VesselForm = lazy(() => import("./pages/VesselForm"));
const ActivityLog = lazy(() => import("./pages/ActivityLog"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-32">
      <div
        className="w-8 h-8 border-3 rounded-full animate-spin"
        style={{
          borderColor: "var(--border-primary)",
          borderTopColor: "var(--accent)",
          borderWidth: 3,
        }}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<Login />} />

            <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
              <Route index element={<Candidates />} />
              <Route path="candidates" element={<Candidates />} />
              <Route path="add-candidate" element={<PrincipalModuleRoute><Candidates /></PrincipalModuleRoute>} />
              <Route path="candidates/:id" element={<CandidateDetails />} />
              <Route path="owner" element={<PrincipalModuleRoute><Owners /></PrincipalModuleRoute>} />
              <Route path="owner/form" element={<PrincipalModuleRoute><OwnerForm /></PrincipalModuleRoute>} />
              <Route path="owner/:id/edit" element={<PrincipalModuleRoute><OwnerForm /></PrincipalModuleRoute>} />
              <Route path="vessel" element={<PrincipalModuleRoute><Vessels /></PrincipalModuleRoute>} />
              <Route path="vessel/form" element={<PrincipalModuleRoute><VesselForm /></PrincipalModuleRoute>} />
              <Route path="vessel/:id/edit" element={<PrincipalModuleRoute><VesselForm /></PrincipalModuleRoute>} />
              <Route path="report" element={<SignOnSignOffReport />} />
              <Route path="document-report" element={<DocumentReport />} />
              <Route path="activity-log" element={<PrincipalModuleRoute><ActivityLog /></PrincipalModuleRoute>} />
              <Route path="users" element={<AdminRoute><Users /></AdminRoute>} />
              <Route path="country" element={<AdminRoute><MasterData /></AdminRoute>} />
              <Route path="state" element={<AdminRoute><MasterData /></AdminRoute>} />
              <Route path="city" element={<AdminRoute><MasterData /></AdminRoute>} />
              <Route path="availability-status" element={<AdminRoute><MasterData /></AdminRoute>} />
              <Route path="seafarers-document-type" element={<AdminRoute><MasterData /></AdminRoute>} />
              <Route path="pre-medical-document-type" element={<AdminRoute><MasterData /></AdminRoute>} />
              <Route path="travel-document-type" element={<AdminRoute><MasterData /></AdminRoute>} />
              <Route path="signoff-document-type" element={<AdminRoute><MasterData /></AdminRoute>} />
              <Route path="global-lookups" element={<AdminRoute><MasterData /></AdminRoute>} />
              <Route path="documents" element={<AdminPanel />} />
              <Route path="settings" element={<AdminPanel />} />
            </Route>

            <Route path="/candidate" element={<Navigate to="/admin" replace />} />
            <Route path="/candiate" element={<Navigate to="/admin" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
