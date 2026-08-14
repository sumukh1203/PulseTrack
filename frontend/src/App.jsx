import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

import DashboardView from './views/DashboardView';
import ApplicationsView from './views/ApplicationsView';
import MetricsView from './views/MetricsView';
import EventsView from './views/EventsView';
import LogsView from './views/LogsView';
import MonitoringView from './views/MonitoringView';
import SettingsView from './views/SettingsView';

import CreateAppModal from './components/CreateAppModal';
import RotateKeyModal from './components/RotateKeyModal';
import CommandPalette from './components/CommandPalette';
import EventSimulatorModal from './components/EventSimulatorModal';

import { fetchApplications, fetchHealth } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [health, setHealth] = useState({ status: 'healthy' });

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRotateModalOpen, setIsRotateModalOpen] = useState(false);
  const [targetRotateApp, setTargetRotateApp] = useState(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  const loadData = async () => {
    const apps = await fetchApplications();
    setApplications(apps || []);
    const h = await fetchHealth();
    setHealth(h);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000); // 15s refresh
    return () => clearInterval(interval);
  }, []);

  const handleAppCreated = (newApp) => {
    loadData();
  };

  const handleOpenRotateModal = (app) => {
    setTargetRotateApp(app);
    setIsRotateModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-[#F8FAFC] flex flex-col font-sans">
      {/* Top Bar */}
      <Navbar
        applications={applications}
        selectedApp={selectedApp}
        onSelectApp={setSelectedApp}
        health={health}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
      />

      {/* Body Container */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          appCount={applications.length}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-y-auto max-w-[1600px]">
          {activeTab === 'dashboard' && (
            <DashboardView
              applications={applications}
              health={health}
              onSelectApp={(app) => {
                setSelectedApp(app);
                setActiveTab('applications');
              }}
              onCreateApp={() => setIsCreateModalOpen(true)}
              onOpenSimulator={() => setIsSimulatorOpen(true)}
            />
          )}

          {activeTab === 'applications' && (
            <ApplicationsView
              applications={applications}
              selectedApp={selectedApp}
              onSelectApp={setSelectedApp}
              onCreateApp={() => setIsCreateModalOpen(true)}
              onOpenRotateModal={handleOpenRotateModal}
            />
          )}

          {activeTab === 'metrics' && (
            <MetricsView applications={applications} selectedApp={selectedApp} />
          )}

          {activeTab === 'events' && <EventsView />}

          {activeTab === 'logs' && <LogsView />}

          {activeTab === 'monitoring' && <MonitoringView health={health} />}

          {activeTab === 'apikeys' && (
            <ApplicationsView
              applications={applications}
              selectedApp={selectedApp}
              onSelectApp={setSelectedApp}
              onCreateApp={() => setIsCreateModalOpen(true)}
              onOpenRotateModal={handleOpenRotateModal}
            />
          )}

          {activeTab === 'settings' && <SettingsView selectedApp={selectedApp} />}
        </main>
      </div>

      {/* Global Modals */}
      <CreateAppModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleAppCreated}
      />

      <RotateKeyModal
        isOpen={isRotateModalOpen}
        app={targetRotateApp}
        onClose={() => setIsRotateModalOpen(false)}
        onRotated={loadData}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectTab={setActiveTab}
        onCreateApp={() => setIsCreateModalOpen(true)}
      />

      <EventSimulatorModal
        isOpen={isSimulatorOpen}
        applications={applications}
        onClose={() => setIsSimulatorOpen(false)}
        onEventSent={loadData}
      />
    </div>
  );
}
