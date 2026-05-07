import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { createSocket } from "../utils/socket";
import { useAuth } from "../context/AuthContext";
import { getDocumentApi, getVersionsApi } from "../api/documentApi";

function EditorPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const socketRef = useRef(null);
  const [content, setContent] = useState("");
  const [version, setVersion] = useState(1);
  const [locked, setLocked] = useState(false);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const docData = await getDocumentApi(id);
      if (!mounted) return;
      setLocked(Boolean(docData.document?.isLocked));

      const versionData = await getVersionsApi(id);
      if (!mounted) return;
      setActivity(
        (versionData.versions || []).slice(0, 10).map((entry) => ({
          user: entry.editedBy?.name || "Unknown",
          at: entry.createdAt,
          op: entry.operation?.type || "set"
        }))
      );
    };

    init().catch(() => {});

    const socket = createSocket(token);
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-document", { documentId: id });
    });

    socket.on("document-state", (state) => {
      setContent(state.content || "");
      setVersion(state.version || 1);
    });

    socket.on("receive-operation", (payload) => {
      setContent(payload.content || "");
      setVersion(payload.version || version);
      setActivity((prev) => [
        {
          user: payload.editor?.name || "Unknown",
          at: payload.timestamp,
          op: payload.operation?.type || "set"
        },
        ...prev.slice(0, 9)
      ]);
    });

    socket.on("error-event", () => {});

    return () => {
      mounted = false;
      socket.emit("leave-document", { documentId: id });
      socket.disconnect();
    };
  }, [id, token]);

  const onChange = (e) => {
    if (locked || !socketRef.current) return;

    const next = e.target.value;
    const old = content;
    setContent(next);

    if (next.length > old.length) {
      const inserted = next.slice(old.length);
      socketRef.current.emit("send-operation", {
        documentId: id,
        baseVersion: version,
        operation: { type: "insert", position: old.length, text: inserted }
      });
    } else if (next.length < old.length) {
      socketRef.current.emit("send-operation", {
        documentId: id,
        baseVersion: version,
        operation: { type: "delete", position: next.length, length: old.length - next.length }
      });
    }
  };

  return (
    <>
      <Navbar />
      <main className="container editor-layout">
        <section className="card">
          <p className="eyebrow">Official Draft Console</p>
          <h3>Collaborative Editor</h3>
          <div className="editor-meta">
            <span>Document ID: {id}</span>
            <span>Version: {version}</span>
          </div>
          {locked ? <p className="error">Document is locked. Editing disabled.</p> : null}
          <textarea className="editor" value={content} onChange={onChange} disabled={locked} />
        </section>
        <section className="card">
          <p className="eyebrow">Audit Snapshot</p>
          <h3>Recent Activity</h3>
          <ul className="activity">
            {activity.map((item, idx) => (
              <li key={`${item.at}-${idx}`}>
                {item.user} - {item.op} - {new Date(item.at).toLocaleString()}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}

export default EditorPage;
