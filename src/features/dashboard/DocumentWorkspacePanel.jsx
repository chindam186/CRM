import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.min.js",
  import.meta.url
).toString();

export default function DocumentWorkspacePanel({ doc, role }) {
  const [progress, setProgress] = useState(0);
  const [pages, setPages] = useState([]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [nextPageId, setNextPageId] = useState(1);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState({});
  const [annotations, setAnnotations] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [activeAction, setActiveAction] = useState("");
  const activeTimer = useRef(null);
  const [pdfError, setPdfError] = useState("");
  const [fileSizeBytes, setFileSizeBytes] = useState(0);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [loadCancelled, setLoadCancelled] = useState(false);
  const [sizeFetchError, setSizeFetchError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [lastSnapshot, setLastSnapshot] = useState(null);
  const [lastAction, setLastAction] = useState("");
  const [operationError, setOperationError] = useState("");
  const [hasUserEdits, setHasUserEdits] = useState(false);
  const streamedUrl = "http://localhost:9000/pdf?file=sample-2.pdf";
  const isAdmin = role === "admin";
  const canAnnotate = isAdmin || role === "reviewer";
  const progressTimer = useRef(null);
  const [pageResolution, setPageResolution] = useState({});

  function buildPageContent(index) {
    const section = (index % 5) + 1;
    return `Page ${index} summary. Section ${section} notes and highlights for this page.`;
  }

  useEffect(() => {
    if (!doc) {
      setProgress(0);
      setPages([]);
      setSelectedPageId("");
      setNextPageId(1);
      setFileSizeBytes(0);
      setPdfPageCount(0);
      setIsLoadingDoc(false);
      setLoadCancelled(false);
      setSizeFetchError("");
      setLastSnapshot(null);
      setLastAction("");
      setOperationError("");
      setHasUserEdits(false);
      return;
    }

    setProgress(0);
    setIsLoadingDoc(true);
    setLoadCancelled(false);
    setPdfPageCount(0);
    setHasUserEdits(false);
    const seedCount = 1;
    const seededPages = Array.from({ length: seedCount }, (_, index) => ({
      id: `page-${index + 1}`,
      content: buildPageContent(index + 1)
    }));
    setPages(seededPages);
    setSelectedPageId(seededPages[0]?.id || "");
    setNextPageId(seededPages.length + 1);
    setPdfError("");
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
    }
    progressTimer.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (progressTimer.current) {
            clearInterval(progressTimer.current);
          }
          setIsLoadingDoc(false);
          return 100;
        }
        return prev + 10;
      });
    }, 120);

    return () => {
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
      }
    };
  }, [doc]);

  useEffect(() => {
    return () => {
      if (activeTimer.current) {
        clearTimeout(activeTimer.current);
      }
    };
  }, []);

  function markActive(action, persistent = false) {
    setActiveAction(action);
    if (activeTimer.current) {
      clearTimeout(activeTimer.current);
      activeTimer.current = null;
    }
    if (!persistent) {
      activeTimer.current = setTimeout(() => setActiveAction(""), 1500);
    }
  }

  useEffect(() => {
    if (!doc || pdfPageCount <= 0) return;
    if (hasUserEdits) return;
    syncPagesWithCount(pdfPageCount);
  }, [doc, pdfPageCount, hasUserEdits]);

  useEffect(() => {
    let active = true;
    async function fetchSize() {
      try {
        let length = 0;
        setSizeFetchError("");
        const headResponse = await fetch(streamedUrl, { method: "HEAD" });
        const headLength = headResponse.headers.get("content-length");
        if (headLength) {
          length = Number(headLength);
        } else {
          const rangeResponse = await fetch(streamedUrl, {
            headers: { Range: "bytes=0-0" }
          });
          const range = rangeResponse.headers.get("content-range");
          if (range && range.includes("/")) {
            length = Number(range.split("/")[1]);
          }
        }

        if (active && length > 0) {
          setFileSizeBytes(length);
        }
      } catch (error) {
        if (active) {
          setFileSizeBytes(0);
          setSizeFetchError("Unable to fetch file size.");
        }
      }
    }

    fetchSize();
    return () => {
      active = false;
    };
  }, [doc, streamedUrl]);

  const sizeLabel = useMemo(() => {
    if (!doc) return "";
    if (fileSizeBytes > 0) {
      const mb = Math.round(fileSizeBytes / (1024 * 1024));
      const gb = (fileSizeBytes / (1024 * 1024 * 1024)).toFixed(2);
      return `${gb} GB (${mb} MB)`;
    }
    const mb = Math.round(doc.sizeGb * 1024);
    return `${doc.sizeGb} GB (${mb} MB)`;
  }, [doc, fileSizeBytes]);

  if (!doc) {
    return (
      <section className="document-panel empty">
        <h3>Document Workspace</h3>
        <p>Select a customer row to load the associated document bundle.</p>
        <ul>
          <li>Progressive streaming keeps the UI responsive.</li>
          <li>Page virtualization renders only visible pages.</li>
          <li>Worker-based parsing prevents main-thread jank.</li>
        </ul>
      </section>
    );
  }

  const viewerUrl = streamedUrl;

  const maxPreviewPages = pages.length;
  const previewPages = pages.slice(0, maxPreviewPages);
  const visiblePages = previewPages;
  const selectedIndex = previewPages.findIndex((page) => page.id === selectedPageId);
  const selectedPage = previewPages[selectedIndex] || previewPages[0];
  const selectedPageNumber = selectedIndex >= 0 ? selectedIndex + 1 : 1;
  useEffect(() => {
    // Reset low-resolution render when selection changes
    if (selectedPageId) {
      setPageResolution((prev) => ({ ...prev, [selectedPageId]: "low" }));
    }
  }, [selectedPageId]);

  function syncPagesWithCount(count) {
    if (!count || count <= 0) return;
    if (pages.length === count) return;
    const seededPages = Array.from({ length: count }, (_, index) => ({
      id: `page-${index + 1}`,
      content: buildPageContent(index + 1)
    }));
    setPages(seededPages);
    setSelectedPageId(seededPages[0]?.id || "");
    setNextPageId(seededPages.length + 1);
  }

  function takeSnapshot(actionLabel) {
    setLastSnapshot({
      pages,
      selectedPageId,
      comments,
      annotations
    });
    setLastAction(actionLabel);
    setOperationError("");
  }

  function handleUndo() {
    if (!lastSnapshot) return;
    setPages(lastSnapshot.pages);
    setSelectedPageId(lastSnapshot.selectedPageId);
    setComments(lastSnapshot.comments);
    setAnnotations(lastSnapshot.annotations);
    setLastSnapshot(null);
    setLastAction("");
  }

  function handleRetryLoad() {
    setPdfError("");
    setRetryKey((prev) => prev + 1);
  }

  function handleSplit() {
    if (!isAdmin) return;
    if (!selectedPage) return;
    takeSnapshot("Split page");
    setHasUserEdits(true);
    const newId = `page-${nextPageId}`;
    setNextPageId((prev) => prev + 1);

    setPages((prev) => {
      const index = prev.findIndex((page) => page.id === selectedPageId);
      if (index < 0) return prev;
      const current = prev[index];
      const mid = Math.max(1, Math.floor(current.content.length / 2));
      const left = current.content.slice(0, mid).trim() || current.content;
      const right = current.content.slice(mid).trim() || current.content;
      const updated = [...prev];
      updated[index] = { ...current, content: left };
      updated.splice(index + 1, 0, { id: newId, content: right });
      return updated;
    });
  }

  function handleMerge() {
    if (!isAdmin) return;
    takeSnapshot("Merge pages");
    setHasUserEdits(true);

    const ids = { currentId: "", nextId: "" };

    setPages((prev) => {
      const index = prev.findIndex((p) => p.id === selectedPageId);
      if (index < 0 || index >= prev.length - 1) return prev;
      const updated = [...prev];
      const current = updated[index];
      const next = updated[index + 1];
      if (!current || !next) return prev;
      ids.currentId = current.id;
      ids.nextId = next.id;
      const mergedContent = `${current.content}\n\n${next.content}`;
      updated[index] = { ...current, content: mergedContent };
      updated.splice(index + 1, 1);
      return updated;
    });

    if (ids.currentId) {
      setSelectedPageId(ids.currentId);
      setEditMode(true);
    }

    if (ids.currentId && ids.nextId) {
      setComments((prev) => {
        const copy = { ...prev };
        const mergedComments = [
          ...(copy[ids.currentId] || []),
          ...(copy[ids.nextId] || [])
        ];
        if (mergedComments.length) {
          copy[ids.currentId] = mergedComments;
        }
        delete copy[ids.nextId];
        return copy;
      });

      setAnnotations((prev) =>
        prev.map((item) =>
          item.pageId === ids.nextId ? { ...item, pageId: ids.currentId } : item
        )
      );
    }
  }

  function handleDeletePage() {
    if (!isAdmin) return;
    if (selectedIndex < 0 || pages.length === 0) return;
    takeSnapshot("Delete page");
    setHasUserEdits(true);
    const targetId = selectedPageId;
    const nextSelection =
      pages[selectedIndex + 1]?.id || pages[selectedIndex - 1]?.id || "";

    setPages((prev) => prev.filter((page) => page.id !== targetId));
    setSelectedPageId(nextSelection);

    setComments((prev) => {
      const next = { ...prev };
      delete next[targetId];
      return next;
    });
    setAnnotations((prev) => prev.filter((item) => item.pageId !== targetId));
  }

  function handleAddComment() {
    if (!comment.trim() || !selectedPageId) return;
    takeSnapshot("Add comment");
    setComments((prev) => {
      const next = { ...prev };
      const list = next[selectedPageId] || [];
      next[selectedPageId] = [...list, comment.trim()];
      return next;
    });
    setComment("");
  }

  function handleAnnotate() {
    if (!canAnnotate || !selectedPageId) return;
    takeSnapshot("Add annotation");
    setAnnotations((prev) => [
      ...prev,
      {
        id: `${selectedPageId}-${prev.length + 1}`,
        pageId: selectedPageId,
        label: "Highlight"
      }
    ]);
  }

  return (
    <section className="document-panel">
      <div className="document-header">
        <div>
          <h3>{doc.title}</h3>
        </div>
        <span className="doc-badge">Streaming</span>
      </div>
      <div className="status-row">
        {isLoadingDoc && !loadCancelled ? (
          <button className="action-btn" onClick={() => {
            if (progressTimer.current) {
              clearInterval(progressTimer.current);
            }
            setIsLoadingDoc(false);
            setLoadCancelled(true);
          }}>
            Cancel Load
          </button>
        ) : null}
        {loadCancelled ? <span className="status-text">Load cancelled.</span> : null}
        {sizeFetchError ? (
          <div className="status-text">
            {sizeFetchError}
            <button className="action-btn" onClick={() => setRetryKey((prev) => prev + 1)}>
              Retry
            </button>
          </div>
        ) : null}
        {lastSnapshot ? (
          <div className="status-text">
            {lastAction} applied.
            <button className="action-btn" onClick={handleUndo}>Undo</button>
          </div>
        ) : null}
        {operationError ? <span className="status-text error">{operationError}</span> : null}
      </div>

      <div className="doc-actions">
        <button
          className={`action-btn ${editMode ? "active" : ""}`}
          onClick={() => {
            const next = !editMode;
            setEditMode(next);
            if (next) {
              markActive("edit", true);
            } else {
              setActiveAction("");
            }
          }}
          disabled={!isAdmin}
        >
          {editMode ? "Exit Edit" : "Edit"}
        </button>
        <button
          className={`action-btn ${activeAction === "split" ? "active" : ""}`}
          onClick={() => {
            handleSplit();
            markActive("split");
          }}
          disabled={!isAdmin}
        >
          Split
        </button>
        <button
          className={`action-btn ${activeAction === "merge" ? "active" : ""}`}
          onClick={() => {
            handleMerge();
            markActive("merge");
          }}
          disabled={!isAdmin}
        >
          Merge
        </button>
        <button className="action-btn danger" onClick={handleDeletePage} disabled={!isAdmin}>
          Delete Page
        </button>
        <button className="action-btn" onClick={handleAnnotate} disabled={!canAnnotate}>
          Add Annotation
        </button>
      </div>

      <div className="doc-preview">
        <div className="preview-header">Preview</div>
        <div className="preview-body">
          {visiblePages.map((page, index) => (
            <button
              key={page.id}
              className={`preview-page${page.id === selectedPageId ? " active" : ""}`}
              onClick={() => setSelectedPageId(page.id)}
            >
              Page {index + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="page-content">
        <div className="preview-header">
          Viewing page {selectedPageNumber} of {maxPreviewPages || 0}
        </div>
        {editMode ? (
          <textarea
            className="page-textarea"
            value={selectedPage?.content || ""}
            onChange={(event) => {
              const value = event.target.value;
              setHasUserEdits(true);
              setPages((prev) =>
                prev.map((page) =>
                  page.id === selectedPageId ? { ...page, content: value } : page
                )
              );
            }}
          />
        ) : null}
        <div className="pdf-viewer">
          {viewerUrl ? (
            <Document
              file={viewerUrl}
              key={retryKey}
              loading={<div className="pdf-skeleton" />}
              onLoadError={(error) => setPdfError(error?.message || "PDF load failed")}
              onLoadSuccess={(info) => {
                const count = info.numPages || 0;
                setPdfPageCount(count);
                syncPagesWithCount(count);
              }}
            >
              <Page
                key={`page-${selectedPageId}-${retryKey}`}
                pageNumber={Math.min(selectedPageNumber, pdfPageCount || selectedPageNumber)}
                width={pageResolution[selectedPageId] === "high" ? 620 : 360}
                scale={pageResolution[selectedPageId] === "high" ? 1.2 : 0.7}
                renderTextLayer={pageResolution[selectedPageId] === "high"}
                renderAnnotationLayer={false}
                onRenderSuccess={() => {
                  // After a quick low-res render, upgrade to high-res
                  if (pageResolution[selectedPageId] !== "high") {
                    setTimeout(() => {
                      setPageResolution((prev) => ({ ...prev, [selectedPageId]: "high" }));
                    }, 150);
                  }
                }}
              />
            </Document>
          ) : (
            <div className="pdf-placeholder">PDF preview unavailable.</div>
          )}
          {pdfError ? (
            <div className="pdf-error">
              {pdfError}
              <button className="action-btn" onClick={handleRetryLoad}>Retry</button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="page-panel">
        <div>
          <h4>Page {selectedPageNumber} Comments</h4>
          <div className="comment-box">
            <input
              className="cell-input"
              placeholder="Add a comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
            <button className="action-btn primary" onClick={handleAddComment}>
              Add
            </button>
          </div>
          <ul className="comment-list">
            {(comments[selectedPageId] || []).map((item, index) => (
              <li key={`${selectedPageId}-${index}`}>{item}</li>
            ))}
            {(comments[selectedPageId] || []).length === 0 ? (
              <li className="muted">No comments yet.</li>
            ) : null}
          </ul>
        </div>
        <div>
          <h4>Annotations</h4>
          <ul className="comment-list">
            {annotations.length === 0 ? (
              <li className="muted">No annotations yet.</li>
            ) : (
              annotations.map((item) => {
                const pageNumber = pages.findIndex((page) => page.id === item.pageId) + 1;
                return (
                  <li key={item.id}>
                    {item.label} on page {pageNumber > 0 ? pageNumber : "?"}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
