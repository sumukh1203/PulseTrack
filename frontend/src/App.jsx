import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

import OverviewView from './views/OverviewView';
import EventsView from './views/EventsView';
import ApplicationsView from './views/ApplicationsView';
import ApiView from './views/ApiView';
import SettingsView from './views/SettingsView';

import CreateAppModal from './components/CreateAppModal';
import RotateKeyModal from './components/RotateKeyModal';
import CommandPalette from './components/CommandPalette';
import EventSimulatorModal from './components/EventSimulatorModal';
import EventDetailModal from './components/EventDetailModal';

import { fetchApplications, fetchHealth } from './services/api';
import { useAnalytics } from './hooks/useAnalytics';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'events' | 'applications' | 'api' | 'settings'
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [health, setHealth] = useState({ status: 'healthy' });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRotateModalOpen, setIsRotateModalOpen] = useState(false);
  const [targetRotateApp, setTargetRotateApp] = useState(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  // Event Detail Modal State
  const [detailEventName, setDetailEventName] = useState(null);

  // Custom Analytics Hook
  const analytics = useAnalytics(selectedApp);

  const loadBaseData = async () => {
    const apps = await fetchApplications();
    setApplications(apps || []);
    if (!selectedApp && apps && apps.length > 0) {
      setSelectedApp(apps[0]);
    }
    const h = await fetchHealth();
    setHealth(h);
  };

  useEffect(() => {
    loadBaseData();
  }, []);

  const handleAppCreated = (newApp) => {
    loadBaseData();
    if (newApp) {
      setSelectedApp(newApp);
    }
  };

  const handleOpenRotateModal = (app) => {
    setTargetRotateApp(app);
    setIsRotateModalOpen(true);
  };

  const handleSelectEventName = (eventName) => {
    setDetailEventName(eventName);
  };

  return (
    <div className="min-h-screen bg-[var(--pt-bg-base)] text-[var(--pt-text-primary)] flex flex-col font-sans">
      {/* Header */}
      <Navbar
        applications={applications}
        selectedApp={selectedApp}
        onSelectApp={setSelectedApp}
        health={health}
        dateRange={analytics.dateRange}
        onRangeChange={analytics.setDateRange}
        comparePeriod={analytics.comparePeriod}
        onCompareToggle={analytics.setComparePeriod}
        customStart={analytics.customStart}
        onCustomStartChange={analytics.setCustomStart}
        customEnd={analytics.customEnd}
        onCustomEndChange={analytics.setCustomEnd}
        onRefresh={analytics.loadAnalytics}
        isRefreshing={analytics.loading}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        activeTab={activeTab}
      />

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          appCount={applications.length}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Content Container */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-[1600px] mx-auto w-full">
          {activeTab === 'overview' && (
            <OverviewView
              selectedApp={selectedApp}
              analytics={analytics}
              health={health}
              onSelectEvent={handleSelectEventName}
              onOpenSimulator={() => setIsSimulatorOpen(true)}
              onOpenDocs={() => setActiveTab('api')}
              onCreateApp={() => setIsCreateModalOpen(true)}
              onOpenSettings={() => setActiveTab('settings')}
            />
          )}

          {activeTab === 'events' && (
            <EventsView
              recentEvents={analytics.recentEvents}
              selectedApp={selectedApp}
              onSelectEventName={handleSelectEventName}
            />
          )}

          {activeTab === 'applications' && (
            <ApplicationsView
              applications={applications}
              selectedApp={selectedApp}
              onSelectApp={setSelectedApp}
              onCreateApp={() => setIsCreateModalOpen(true)}
              onOpenRotateModal={handleOpenRotateModal}
              analytics={analytics}
              onSelectTab={setActiveTab}
            />
          )}

          {activeTab === 'api' && (
            <ApiView
              selectedApp={selectedApp}
              onOpenSimulator={() => setIsSimulatorOpen(true)}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              selectedApp={selectedApp}
              onOpenRotateModal={handleOpenRotateModal}
              analytics={analytics}
            />
          )}
        </main>
      </div>

      {/* Event Detail Report Modal */}
      <EventDetailModal
        isOpen={!!detailEventName}
        eventName={detailEventName}
        selectedApp={selectedApp}
        onClose={() => setDetailEventName(null)}
      />

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
        onRotated={loadBaseData}
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
        onEventSent={() => {
          loadBaseData();
          analytics.loadAnalytics();
        }}
      />
    </div>
  );
}
