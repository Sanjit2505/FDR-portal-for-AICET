import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
import { OverviewPage } from './pages/overview/OverviewPage';
import { InstitutionsPage } from './pages/institutions/InstitutionsPage';
import { FDRRegistryPage } from './pages/fdr/FDRRegistryPage';
import { SubmitFDRPage } from './pages/fdr/SubmitFDRPage';
import { FDRDetailPage } from './pages/fdr/FDRDetailPage';
import { DocumentVaultPage } from './pages/documents/DocumentVaultPage';
import { DocumentDetailPage } from './pages/documents/DocumentDetailPage';
import { RiskWorkspacePage } from './pages/risk/RiskWorkspacePage';
import { RelationshipGraphPage } from './pages/graph/RelationshipGraphPage';
import { CasesPage } from './pages/cases/CasesPage';
import { CaseDetailPage } from './pages/cases/CaseDetailPage';
import { MaturityPlannerPage } from './pages/maturity/MaturityPlannerPage';
import { AuditTrailPage } from './pages/audit/AuditTrailPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { SettingsPage } from './pages/settings/SettingsPage';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/overview" replace />} />
            <Route path="overview" element={<OverviewPage />} />
            <Route path="institutions" element={<InstitutionsPage />} />
            <Route path="fdr" element={<FDRRegistryPage />} />
            <Route path="fdr/new" element={<SubmitFDRPage />} />
            <Route path="fdr/:fdrId" element={<FDRDetailPage />} />
            <Route path="documents" element={<DocumentVaultPage />} />
            <Route path="documents/:documentId" element={<DocumentDetailPage />} />
            <Route path="risk" element={<RiskWorkspacePage />} />
            <Route path="graph" element={<RelationshipGraphPage />} />
            <Route path="cases" element={<CasesPage />} />
            <Route path="cases/:caseId" element={<CaseDetailPage />} />
            <Route path="maturity" element={<MaturityPlannerPage />} />
            <Route path="audit" element={<AuditTrailPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* 404 fallback */}
          <Route
            path="*"
            element={
              <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center text-center p-4">
                <span className="font-mono text-4xl font-bold text-primary-400">404</span>
                <h1 className="text-xl font-bold text-white mt-2">Dossier or Route Not Found</h1>
                <p className="text-xs text-slate-400 mt-1">The requested institutional record or path does not exist.</p>
                <a href="#/overview" className="mt-4 px-4 py-2 rounded-xl bg-primary-600 text-white text-xs font-semibold">
                  Return to Dashboard
                </a>
              </div>
            }
          />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;
