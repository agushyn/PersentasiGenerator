export type ViewId = "dashboard" | "new" | "projects" | "library" | "settings" | "harness";

export interface NavItem {
  id: ViewId;
  label: string;
}

/** Primary navigation from DESIGN.md section 3. The harness lives under Settings. */
export const PRIMARY_NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "new", label: "New Presentation" },
  { id: "projects", label: "Projects" },
  { id: "library", label: "Design Library" },
  { id: "settings", label: "Settings" },
];
