import { useEffect, useMemo, useState } from "react";

const FIRST_NAMES = [
  "Jane",
  "Floyd",
  "Ronald",
  "Marvin",
  "Jerome",
  "Kathryn",
  "Jacob",
  "Kristin",
  "Savannah",
  "Cameron",
  "Brooklyn",
  "Leslie",
  "Courtney",
  "Darlene",
  "Eleanor",
  "Devon"
];
const LAST_NAMES = [
  "Cooper",
  "Miles",
  "Richards",
  "McKinney",
  "Bell",
  "Murphy",
  "Jones",
  "Watson",
  "Nguyen",
  "Sullivan",
  "Phillips",
  "Lopez",
  "Scott",
  "Baker",
  "Cole",
  "Fletcher"
];
const COMPANIES = [
  "Microsoft",
  "Yahoo",
  "Adobe",
  "Tesla",
  "Google",
  "Meta",
  "Stripe",
  "Figma",
  "Dropbox",
  "Atlassian",
  "Salesforce"
];
const COUNTRIES = [
  "United States",
  "Kiribati",
  "Israel",
  "Iran",
  "Reunion",
  "Curacao",
  "Brazil",
  "Sweden",
  "Canada",
  "Japan",
  "Singapore"
];

const PAGE_SIZE = 8;

function buildCustomer(index) {
  const first = FIRST_NAMES[index % FIRST_NAMES.length];
  const last = LAST_NAMES[(index * 7) % LAST_NAMES.length];
  const company = COMPANIES[(index * 3) % COMPANIES.length];
  const country = COUNTRIES[(index * 5) % COUNTRIES.length];
  const phoneBlock = String(1000 + ((index * 13) % 9000));
  const phone = `(${200 + (index % 800)}) 555-${phoneBlock}`;
  const email = `${first}.${last}${index}@${company
    .toLowerCase()
    .replace(/\s+/g, "")}.com`;

  return {
    id: `cust-${index}`,
    name: `${first} ${last}`,
    company,
    phone,
    email,
    country,
    role: index % 5 === 0 ? "Admin" : "Reviewer",
    assignedTo: "Unassigned",
    status: index % 4 === 0 ? "Inactive" : "Active"
  };
}

function getPagination(current, total) {
  if (total <= 6) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  if (current <= 3) {
    return [1, 2, 3, 4, "...", total];
  }

  if (current >= total - 2) {
    return [1, "...", total - 3, total - 2, total - 1, total];
  }

  return [1, "...", current - 1, current, current + 1, "...", total];
}

export default function CustomersTable({ role, onOpenDocument, selectedId }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [actionMessage, setActionMessage] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editDraft, setEditDraft] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = role === "admin";

  const initialRows = useMemo(
    () => Array.from({ length: 20000 }, (_, index) => buildCustomer(index + 1)),
    []
  );
  const [rows, setRows] = useState(initialRows);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const scopedRows = isAdmin
      ? rows
      : rows.filter((row) => row.role === "Reviewer");

    if (!term) return scopedRows;

    return scopedRows.filter((row) =>
      [
        row.name,
        row.company,
        row.email,
        row.country,
        row.phone,
        row.status,
        row.role,
        row.assignedTo
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [rows, query, isAdmin]);

  const sorted = useMemo(() => {
    const sortedRows = [...filtered];
    sortedRows.sort((a, b) => {
      const left = String(a[sortKey]).toLowerCase();
      const right = String(b[sortKey]).toLowerCase();
      if (left < right) return sortDir === "asc" ? -1 : 1;
      if (left > right) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return sortedRows;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageRows = sorted.slice(startIndex, startIndex + PAGE_SIZE);

  const pagination = getPagination(currentPage, totalPages);

  function handleSort(nextKey) {
    if (nextKey === sortKey) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(nextKey);
      setSortDir("asc");
    }
    setPage(1);
  }

  function handleSearch(event) {
    setQuery(event.target.value);
    setPage(1);
  }

  function handleAction(action, row) {
    if (!isAdmin) {
      setActionMessage("Reviewer role is read-only.");
      return;
    }
    if (action === "Delete") {
      setRows((prev) => prev.filter((item) => item.id !== row.id));
      setActionMessage(`Deleted ${row.name}`);
      return;
    }

    if (action === "Assign") {
      const nextAssignee =
        row.assignedTo === "Unassigned"
          ? "Team A"
          : row.assignedTo === "Team A"
            ? "Team B"
            : "Team C";
      setRows((prev) =>
        prev.map((item) =>
          item.id === row.id ? { ...item, assignedTo: nextAssignee } : item
        )
      );
      setActionMessage(`Assigned ${row.name} to ${nextAssignee}`);
      return;
    }

    if (action === "Edit") {
      setEditingId(row.id);
      setEditDraft({
        name: row.name,
        company: row.company,
        phone: row.phone,
        email: row.email,
        country: row.country,
        role: row.role,
        status: row.status
      });
    }
  }

  function handleEditChange(field, value) {
    setEditDraft((prev) => ({ ...prev, [field]: value }));
  }

  function handleEditSave(rowId) {
    if (!editDraft) return;
    setRows((prev) =>
      prev.map((item) =>
        item.id === rowId
          ? { ...item, ...editDraft }
          : item
      )
    );
    setEditingId("");
    setEditDraft(null);
    setActionMessage("Customer updated");
  }

  function handleEditCancel() {
    setEditingId("");
    setEditDraft(null);
  }

  const startDisplay = sorted.length === 0 ? 0 : startIndex + 1;
  const endDisplay = Math.min(startIndex + PAGE_SIZE, sorted.length);

  if (isLoading) {
    return (
      <section className="table-card">
        <div className="table-header">
          <div>
            <h2>All Customers</h2>
            <p>Active Members</p>
          </div>
          <div className="search">
            <span className="search-icon" />
            <input placeholder="Search" disabled />
          </div>
        </div>
        <div className="table-skeleton">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="skeleton-row" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="table-card">
      <div className="table-header">
        <div>
          <h2>All Customers</h2>
          <p>Active Members</p>
        </div>
        <div className="search">
          <span className="search-icon" />
          <input placeholder="Search" value={query} onChange={handleSearch} />
        </div>
      </div>
      {actionMessage ? (
        <div className="action-message">{actionMessage}</div>
      ) : null}
      <table className="customers-table">
        <thead>
          <tr>
            <th className="sortable" onClick={() => handleSort("name")}
              onKeyDown={(event) => event.key === "Enter" && handleSort("name")}
              tabIndex={0}
            >
              Customer Name
              <span className="sort-indicator">
                {sortKey === "name" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </span>
            </th>
            <th className="sortable" onClick={() => handleSort("company")}
              onKeyDown={(event) => event.key === "Enter" && handleSort("company")}
              tabIndex={0}
            >
              Company
              <span className="sort-indicator">
                {sortKey === "company" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </span>
            </th>
            <th className="sortable" onClick={() => handleSort("phone")}
              onKeyDown={(event) => event.key === "Enter" && handleSort("phone")}
              tabIndex={0}
            >
              Phone Number
              <span className="sort-indicator">
                {sortKey === "phone" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </span>
            </th>
            <th className="sortable" onClick={() => handleSort("email")}
              onKeyDown={(event) => event.key === "Enter" && handleSort("email")}
              tabIndex={0}
            >
              Email
              <span className="sort-indicator">
                {sortKey === "email" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </span>
            </th>
            <th className="sortable" onClick={() => handleSort("country")}
              onKeyDown={(event) => event.key === "Enter" && handleSort("country")}
              tabIndex={0}
            >
              Country
              <span className="sort-indicator">
                {sortKey === "country" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </span>
            </th>
            <th className="sortable" onClick={() => handleSort("role")}
              onKeyDown={(event) => event.key === "Enter" && handleSort("role")}
              tabIndex={0}
            >
              Role
              <span className="sort-indicator">
                {sortKey === "role" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </span>
            </th>
            <th>Assigned To</th>
            <th className="sortable" onClick={() => handleSort("status")}
              onKeyDown={(event) => event.key === "Enter" && handleSort("status")}
              tabIndex={0}
            >
              Status
              <span className="sort-indicator">
                {sortKey === "status" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </span>
            </th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pageRows.map((row) => {
            const isEditing = editingId === row.id;
            const isSelected = selectedId === row.id;
            return (
              <tr
                key={row.id}
                className={`clickable-row${isSelected ? " selected-row" : ""}`}
                onClick={() => {
                  if (!isEditing && onOpenDocument) {
                    onOpenDocument(row);
                  }
                }}
              >
                <td>
                  {isEditing ? (
                    <input
                      className="cell-input"
                      value={editDraft?.name || ""}
                      onChange={(event) =>
                        handleEditChange("name", event.target.value)
                      }
                    />
                  ) : (
                    row.name
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      className="cell-input"
                      value={editDraft?.company || ""}
                      onChange={(event) =>
                        handleEditChange("company", event.target.value)
                      }
                    />
                  ) : (
                    row.company
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      className="cell-input"
                      value={editDraft?.phone || ""}
                      onChange={(event) =>
                        handleEditChange("phone", event.target.value)
                      }
                    />
                  ) : (
                    row.phone
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      className="cell-input"
                      value={editDraft?.email || ""}
                      onChange={(event) =>
                        handleEditChange("email", event.target.value)
                      }
                    />
                  ) : (
                    row.email
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      className="cell-input"
                      value={editDraft?.country || ""}
                      onChange={(event) =>
                        handleEditChange("country", event.target.value)
                      }
                    />
                  ) : (
                    row.country
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <select
                      className="cell-input"
                      value={editDraft?.role || "Reviewer"}
                      onChange={(event) =>
                        handleEditChange("role", event.target.value)
                      }
                    >
                      <option value="Admin">Admin</option>
                      <option value="Reviewer">Reviewer</option>
                    </select>
                  ) : (
                    row.role
                  )}
                </td>
                <td>{row.assignedTo}</td>
                <td>
                  {isEditing ? (
                    <select
                      className="cell-input"
                      value={editDraft?.status || "Active"}
                      onChange={(event) =>
                        handleEditChange("status", event.target.value)
                      }
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  ) : (
                    <span
                      className={`pill ${
                        row.status === "Active" ? "success" : "danger"
                      }`}
                    >
                      {row.status}
                    </span>
                  )}
                </td>
                <td>
                  <div className="action-buttons">
                    {isEditing ? (
                      <>
                        <button
                          className="action-btn primary"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleEditSave(row.id);
                          }}
                        >
                          Save
                        </button>
                        <button
                          className="action-btn"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleEditCancel();
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="action-btn"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleAction("Edit", row);
                          }}
                          disabled={!isAdmin}
                        >
                          Edit
                        </button>
                        <button
                          className="action-btn"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleAction("Assign", row);
                          }}
                          disabled={!isAdmin}
                        >
                          Assign
                        </button>
                        <button
                          className="action-btn danger"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleAction("Delete", row);
                          }}
                          disabled={!isAdmin}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="table-footer">
        <span>
          Showing data {startDisplay} to {endDisplay} of {sorted.length} entries
        </span>
        <div className="pagination">
          {pagination.map((item, index) => {
            if (item === "...") {
              return (
                <span key={`ellipsis-${index}`} className="page">
                  ...
                </span>
              );
            }

            return (
              <button
                key={item}
                className={`page${item === currentPage ? " active" : ""}`}
                onClick={() => setPage(item)}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
