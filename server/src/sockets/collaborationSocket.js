const jwt = require("jsonwebtoken");
const sanitizeHtml = require("sanitize-html");
const Document = require("../models/Document");
const DocumentVersion = require("../models/DocumentVersion");
const User = require("../models/User");
const { createAuditLog } = require("../services/auditService");
const { USER_ROLES } = require("../utils/constants");

const sessions = new Map();

const sanitizeText = (value = "") =>
  sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });

const canAccessDocument = (document, userId) => {
  if (document.uploadedBy.toString() === userId.toString()) return true;
  return document.participants.some((participant) => participant.toString() === userId.toString());
};

const applyOperation = (content, operation) => {
  const text = String(content || "");
  const position = Math.max(0, Math.min(operation.position || 0, text.length));

  if (operation.type === "insert") {
    const insertText = sanitizeText(operation.text || "");
    return text.slice(0, position) + insertText + text.slice(position);
  }

  if (operation.type === "delete") {
    const length = Math.max(0, operation.length || 0);
    return text.slice(0, position) + text.slice(position + length);
  }

  return text;
};

const transformOperation = (op, prevOp) => {
  const transformed = { ...op };
  if (prevOp.type === "insert" && prevOp.position <= transformed.position) {
    transformed.position += (prevOp.text || "").length;
  }
  if (prevOp.type === "delete" && prevOp.position < transformed.position) {
    transformed.position = Math.max(prevOp.position, transformed.position - (prevOp.length || 0));
  }
  return transformed;
};

const persistVersion = async (documentId, content, userId, operation, versionNumber) => {
  await Document.findByIdAndUpdate(documentId, { currentText: content });
  await DocumentVersion.create({
    document: documentId,
    versionNumber,
    content,
    editedBy: userId,
    operation
  });
};

const initCollaborationSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Unauthorized"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");
      if (!user) return next(new Error("Unauthorized"));
      socket.user = user;
      return next();
    } catch (error) {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("join-document", async ({ documentId }) => {
      const document = await Document.findById(documentId);
      if (!document) {
        socket.emit("error-event", { message: "Document not found" });
        return;
      }
      if (!canAccessDocument(document, socket.user._id)) {
        socket.emit("error-event", { message: "Access denied for this document" });
        return;
      }
      if (document.isLocked) {
        socket.emit("error-event", { message: "Document is locked for edits" });
        return;
      }

      socket.join(documentId);
      if (!sessions.has(documentId)) {
        const latestVersion = await DocumentVersion.findOne({ document: documentId }).sort({
          versionNumber: -1
        });
        sessions.set(documentId, {
          content: latestVersion?.content || document.currentText || "",
          version: latestVersion?.versionNumber || 1,
          pendingOps: []
        });
      }

      const session = sessions.get(documentId);
      socket.emit("document-state", {
        documentId,
        content: session.content,
        version: session.version
      });
    });

    socket.on("send-operation", async ({ documentId, operation, baseVersion }) => {
      if (!sessions.has(documentId)) return;
      const session = sessions.get(documentId);
      const document = await Document.findById(documentId);
      if (!document || document.isLocked) return;
      if (!canAccessDocument(document, socket.user._id)) return;
      if (![USER_ROLES.LEGAL_OFFICER, USER_ROLES.ADMIN].includes(socket.user.role)) {
        socket.emit("error-event", {
          message: "Only Legal Officer can edit official document content. Use suggestions instead."
        });
        return;
      }

      let transformedOperation = { ...operation };
      if (baseVersion < session.version) {
        session.pendingOps
          .filter((entry) => entry.version > baseVersion)
          .forEach((entry) => {
            transformedOperation = transformOperation(transformedOperation, entry.operation);
          });
      }

      session.content = applyOperation(session.content, transformedOperation);
      session.version += 1;
      session.pendingOps.push({
        version: session.version,
        operation: transformedOperation
      });
      if (session.pendingOps.length > 100) {
        session.pendingOps = session.pendingOps.slice(-100);
      }

      await persistVersion(
        documentId,
        session.content,
        socket.user._id,
        transformedOperation,
        session.version
      );
      await createAuditLog({
        actor: socket.user._id,
        action: "DOCUMENT_EDITED",
        resourceType: "Document",
        resourceId: documentId,
        metadata: { operation: transformedOperation, version: session.version },
        ipAddress: socket.handshake.address || ""
      });

      io.to(documentId).emit("receive-operation", {
        operation: transformedOperation,
        version: session.version,
        content: session.content,
        editor: {
          id: socket.user._id,
          name: socket.user.name
        },
        timestamp: new Date().toISOString()
      });
    });

    socket.on("leave-document", ({ documentId }) => {
      socket.leave(documentId);
    });

    socket.on("disconnect", () => {
      // Session cleanup strategy can be timer-based in production.
    });
  });
};

module.exports = { initCollaborationSocket };
