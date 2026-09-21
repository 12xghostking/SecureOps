import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { DeploymentsPage } from './pages/DeploymentsPage';
import { SecurityFindingsPage } from './pages/SecurityFindingsPage';
import { PipelinesPage } from './pages/PipelinesPage';
import { EnvironmentsPage } from './pages/EnvironmentsPage';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('dashboard');

  return (
    <div className="app-container">
      <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />
      <div className="main-content">
        <Navbar />
        {currentTab === 'dashboard' && <DashboardPage onNavigate={setCurrentTab} />}
        {currentTab === 'applications' && <ApplicationsPage />}
        {currentTab === 'deployments' && <DeploymentsPage />}
        {currentTab === 'security' && <SecurityFindingsPage />}
        {currentTab === 'pipelines' && <PipelinesPage />}
        {currentTab === 'environments' && <EnvironmentsPage />}
      </div>
    </div>
  );
};

export default App;
