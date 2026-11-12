import { useState } from "react";
import { Layout } from "./Layout";
import { DashboardView } from "../features/dashboard/DashboardView";
import { NewPresentationView } from "../features/new-presentation/NewPresentationView";
import { ProjectsView } from "../features/projects/ProjectsView";
import { DesignLibraryView } from "../features/design-library/DesignLibraryView";
import { SettingsView } from "../features/settings/SettingsView";
import { ValidationHarnessView } from "../features/harness/ValidationHarnessView";
import type { ViewId } from "./navigation";

export default function App() {
  const [view, setView] = useState<ViewId>("dashboard");

  return (
    <Layout active={view} onNavigate={setView}>
      {view === "dashboard" && <DashboardView onNavigate={setView} />}
      {view === "new" && <NewPresentationView onNavigate={setView} />}
      {view === "projects" && <ProjectsView onNavigate={setView} />}
      {view === "library" && <DesignLibraryView />}
      {view === "settings" && <SettingsView onNavigate={setView} />}
      {view === "harness" && <ValidationHarnessView />}
    </Layout>
  );
}
