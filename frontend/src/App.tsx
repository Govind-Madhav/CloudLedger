import { useState, useEffect } from 'react';
import { api, getToken, removeToken } from './api';
import type { AdminUser, DashboardData } from './api';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import type { NavTab } from './components/Sidebar';
import { LoginView } from './views/LoginView';
import { OverviewView } from './views/OverviewView';
import { StudentsView } from './views/StudentsView';
import { ResourcesView } from './views/ResourcesView';
import { ActivityView } from './views/ActivityView';
import { CostsView } from './views/CostsView';
import { SystemView } from './views/SystemView';

export function App() {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [initialUntagged, setInitialUntagged] = useState(false);

  const checkAuth = async () => {
    const token = getToken();
    if (!token) {
      setAdmin(null);
      setLoading(false);
      return;
    }

    try {
      const user = await api.getMe();
      setAdmin(user);
      loadDashboard();
    } catch {
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = async () => {
    try {
      const data = await api.getOverview();
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to load dashboard KPIs', err);
    }
  };

  useEffect(() => {
    checkAuth();

    const handleAuthExpired = () => {
      setAdmin(null);
    };

    window.addEventListener('auth_expired', handleAuthExpired);
    return () => window.removeEventListener('auth_expired', handleAuthExpired);
  }, []);

  const handleLogout = () => {
    removeToken();
    setAdmin(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
        Loading CloudLedger...
      </div>
    );
  }

  if (!admin) {
    return (
      <LoginView
        onLoginSuccess={(newAdmin) => {
          setAdmin(newAdmin);
          loadDashboard();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar
        admin={admin}
        onLogout={handleLogout}
        isDemoMode={dashboardData?.kpis.is_demo_mode ?? true}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setInitialUntagged(false);
            setCurrentTab(tab);
          }}
          openAlertsCount={dashboardData?.kpis.open_alerts_count}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'overview' && dashboardData && (
              <OverviewView
                data={dashboardData}
                onNavigateToStudents={() => setCurrentTab('students')}
                onNavigateToResources={(untaggedOnly = false) => {
                  setInitialUntagged(untaggedOnly);
                  setCurrentTab('resources');
                }}
              />
            )}

            {currentTab === 'students' && <StudentsView />}

            {currentTab === 'resources' && (
              <ResourcesView initialUntaggedOnly={initialUntagged} />
            )}

            {currentTab === 'activity' && <ActivityView />}

            {currentTab === 'costs' && <CostsView />}

            {currentTab === 'system' && <SystemView />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
