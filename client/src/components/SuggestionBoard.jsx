import { useState } from "react";

function SuggestionBoard({
  user,
  suggestions,
  onCreateSuggestion,
  onReviewSuggestion,
  onCommentSuggestion,
  disabled
}) {
  const [draft, setDraft] = useState({ suggestionText: "", context: "" });
  const [commentDrafts, setCommentDrafts] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canSuggest = ["Seller", "Buyer"].includes(user?.role);
  const canReview = ["Registrar", "Admin"].includes(user?.role);
  const canComment = ["Seller", "Buyer", "Registrar", "Admin"].includes(user?.role);

  const submitSuggestion = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onCreateSuggestion(draft);
      setDraft({ suggestionText: "", context: "" });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create suggestion");
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async (suggestionId) => {
    const text = (commentDrafts[suggestionId] || "").trim();
    if (!text) return;
    setError("");
    setLoading(true);
    try {
      await onCommentSuggestion(suggestionId, { text });
      setCommentDrafts((prev) => ({ ...prev, [suggestionId]: "" }));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add comment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card">
      <div className="section-head">
        <div>
          <p className="eyebrow">Suggestion Mode</p>
          <h3>Review Notes And Decisions</h3>
        </div>
      </div>

      {canSuggest ? (
        <form className="suggestion-form" onSubmit={submitSuggestion}>
          <input
            placeholder="Suggestion context, e.g. Buyer clause or property description"
            value={draft.context}
            onChange={(e) => setDraft((prev) => ({ ...prev, context: e.target.value }))}
            disabled={disabled || loading}
          />
          <textarea
            placeholder="Enter suggestion or proposed correction"
            value={draft.suggestionText}
            onChange={(e) => setDraft((prev) => ({ ...prev, suggestionText: e.target.value }))}
            disabled={disabled || loading}
          />
          <button className="btn" disabled={disabled || loading || !draft.suggestionText.trim()}>
            {loading ? "Saving..." : "Add Suggestion"}
          </button>
        </form>
      ) : null}

      {error ? <p className="error">{error}</p> : null}

      <div className="suggestion-list">
        {suggestions.length === 0 ? (
          <p className="hint">No suggestions added yet.</p>
        ) : (
          suggestions.map((suggestion) => (
            <article className="suggestion-card" key={suggestion._id}>
              <div className="suggestion-head">
                <div>
                  <strong>{suggestion.suggestedBy?.name || "Unknown user"}</strong>
                  <span className="suggestion-role">{suggestion.suggestedBy?.role}</span>
                </div>
                <span className={`badge ${statusBadgeClass(suggestion.status)}`}>{suggestion.status}</span>
              </div>

              {suggestion.context ? <p className="suggestion-context">{suggestion.context}</p> : null}
              <p className="suggestion-text">{suggestion.suggestionText}</p>

              {suggestion.reviewNote ? (
                <p className="review-note">Review note: {suggestion.reviewNote}</p>
              ) : null}

              {canReview && suggestion.status === "Pending" ? (
                <div className="inline-actions">
                  <button
                    className="btn"
                    disabled={loading}
                    onClick={() => onReviewSuggestion(suggestion._id, { status: "Accepted" })}
                    type="button"
                  >
                    Accept
                  </button>
                  <button
                    className="btn btn-secondary"
                    disabled={loading}
                    onClick={() => onReviewSuggestion(suggestion._id, { status: "Rejected" })}
                    type="button"
                  >
                    Reject
                  </button>
                </div>
              ) : null}

              <div className="comment-block">
                <h4>Comments</h4>
                {suggestion.comments?.length ? (
                  suggestion.comments.map((comment, idx) => (
                    <div className="comment-item" key={`${suggestion._id}-${idx}`}>
                      <strong>{comment.author?.name || "Unknown"}:</strong> {comment.text}
                    </div>
                  ))
                ) : (
                  <p className="hint">No comments yet.</p>
                )}

                {canComment ? (
                  <div className="comment-form">
                    <input
                      placeholder="Reply to this suggestion"
                      value={commentDrafts[suggestion._id] || ""}
                      onChange={(e) =>
                        setCommentDrafts((prev) => ({ ...prev, [suggestion._id]: e.target.value }))
                      }
                      disabled={disabled || loading}
                    />
                    <button
                      className="btn btn-secondary"
                      type="button"
                      disabled={disabled || loading}
                      onClick={() => submitComment(suggestion._id)}
                    >
                      Comment
                    </button>
                  </div>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function statusBadgeClass(status) {
  if (status === "Accepted") return "badge-green";
  if (status === "Rejected") return "badge-orange";
  return "badge-gray";
}

export default SuggestionBoard;
