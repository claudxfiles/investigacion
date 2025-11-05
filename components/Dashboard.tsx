'use client';

import { useState } from 'react';
import { Project } from '@/types';
import { ProjectList } from './ProjectList';
import { CreateProject } from './CreateProject';
import { ProjectDashboard } from './ProjectDashboard';
import { Header } from './Header';

export function Dashboard() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleProjectCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedProject ? (
          <ProjectDashboard
            project={selectedProject}
            onBack={() => setSelectedProject(null)}
          />
        ) : (
          <ProjectList
            key={refreshKey}
            onSelectProject={setSelectedProject}
            onCreateProject={() => setShowCreateProject(true)}
          />
        )}
      </main>

      {showCreateProject && (
        <CreateProject
          onClose={() => setShowCreateProject(false)}
          onSuccess={handleProjectCreated}
        />
      )}
    </div>
  );
}

