import { Suspense, lazy, useState } from "react";
import Sidebar from "./Sidebar.jsx";
import SummaryCards from "./SummaryCards.jsx";
import CustomersTable from "./CustomersTable.jsx";
import { getDocumentForRow } from "./mockDocuments.js";

const DocumentWorkspacePanel = lazy(() => import("./DocumentWorkspacePanel.jsx"));

export default function DashboardPage() {
  const [role, setRole] = useState("admin");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedRowId, setSelectedRowId] = useState("");

  function handleOpenDocument(row) {
    setSelectedRowId(row.id);
    setSelectedDoc(getDocumentForRow(row));
  }

  return (
    <div className="dashboard">
      <Sidebar />
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>Hello Evano 👋🏼</h1>
            <p>Welcome back!</p>
          </div>
          <div className="role-switch">
            <span>Role</span>
            <select value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="admin">Admin</option>
              <option value="reviewer">Reviewer</option>
            </select>
          </div>
        </header>
        <SummaryCards />
        <CustomersTable
          role={role}
          onOpenDocument={handleOpenDocument}
          selectedId={selectedRowId}
        />
        <Suspense fallback={<div className="document-panel">Loading workspace...</div>}>
          <DocumentWorkspacePanel doc={selectedDoc} role={role} />
        </Suspense>
      </main>
    </div>
  );
}
