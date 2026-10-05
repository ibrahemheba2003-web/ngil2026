import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceApp } from "@/components/naql/workspace-app";

type Tool = "verify" | "manhaj" | "ask" | "library";

export const Route = createFileRoute("/workspace")({
  validateSearch: (search: Record<string, unknown>): { tool?: Tool } => ({
    tool:
      search.tool === "verify" ||
      search.tool === "manhaj" ||
      search.tool === "ask" ||
      search.tool === "library"
        ? search.tool
        : undefined,
  }),
  component: WorkspacePage,
});

function WorkspacePage() {
  const { tool } = Route.useSearch();
  return <WorkspaceApp initialTool={tool ?? "verify"} />;
}
