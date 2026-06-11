import { useState, useEffect, type FormEvent } from "react";
import api from "../api/client";
import type { Comment } from "../types";
import { useToast } from "../contexts/ToastContext";
import Button from "./Button";

interface Props {
  reportId: string;
  versionId?: string | null;
}

function timeAgo(date: string): string {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export default function CommentThread({ reportId, versionId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    api.get(`/reports/${reportId}/comments`).then((res) => setComments(res.data));
  }, [reportId]);

  const filtered = versionId
    ? comments.filter((c) => c.version_id === versionId || c.version_id === null)
    : comments.filter((c) => c.version_id === null);

  const topLevel = filtered.filter((c) => !c.parent_comment_id);
  const replies = (parentId: string) => filtered.filter((c) => c.parent_comment_id === parentId);

  const postComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    try {
      const payload: Record<string, unknown> = { content };
      if (versionId) payload.version_id = versionId;
      if (replyTo) payload.parent_comment_id = replyTo;
      await api.post(`/reports/${reportId}/comments`, payload);
      setContent("");
      setReplyTo(null);
      const res = await api.get(`/reports/${reportId}/comments`);
      setComments(res.data);
    } catch {
      addToast("Couldn't post comment. Try again.", "error");
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!window.confirm("Delete this comment? This can't be undone.")) return;
    try {
      await api.delete(`/reports/comments/${commentId}`);
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, is_deleted: true, content: "[deleted]" } : c))
      );
    } catch {
      addToast("Couldn't delete comment. Try again.", "error");
    }
  };

  return (
    <div>
      <h3 style={{ font: "var(--font-headline-sm)", margin: "0 0 var(--space-md)" }}>Comments</h3>

      <form onSubmit={postComment} style={{ display: "flex", gap: "var(--space-sm)", marginBottom: "var(--space-md)" }}>
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={replyTo ? "Write a reply..." : "Write a comment..."}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: "var(--rounded-sm)",
            border: "1px solid var(--color-outline-variant)",
            font: "var(--font-body-md)",
            outline: "none",
          }}
        />
        <Button type="submit">{replyTo ? "Post reply" : "Post comment"}</Button>
        {replyTo && (
          <Button variant="secondary" type="button" onClick={() => setReplyTo(null)}>Cancel reply</Button>
        )}
      </form>

      {topLevel.length === 0 && (
        <p style={{ color: "var(--color-on-surface-variant)", font: "var(--font-body-md)" }}>
          No comments yet. Write a comment above to start the discussion.
        </p>
      )}

      {topLevel.map((comment) => (
        <div key={comment.id} style={{ marginBottom: 12, padding: "var(--space-sm) var(--space-md)", borderLeft: "3px solid var(--color-outline-variant)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-xs)" }}>
            <strong style={{ font: "var(--font-label-md)" }}>
                User
            </strong>
            <span style={{ font: "var(--font-code-sm)", color: "var(--color-outline)" }}>
              {timeAgo(comment.created_at)}
            </span>
            {comment.version_id && (
              <span style={{ font: "var(--font-code-sm)", color: "var(--color-outline)" }}>
                v{comment.version_id.slice(0, 8)}
              </span>
            )}
          </div>
          <p style={{ margin: "var(--space-xs) 0", font: "var(--font-body-md)" }}>{comment.content}</p>
          {!comment.is_deleted && (
            <div style={{ display: "flex", gap: "var(--space-sm)" }}>
              <Button variant="ghost" style={{ fontSize: 12, padding: "2px 8px" }} onClick={() => setReplyTo(comment.id)}>Reply</Button>
              <Button variant="ghost" style={{ fontSize: 12, padding: "2px 8px", color: "var(--color-error)" }} onClick={() => deleteComment(comment.id)}>Delete</Button>
            </div>
          )}

          {replies(comment.id).map((reply) => (
            <div
              key={reply.id}
              style={{
                marginLeft: 24,
                marginTop: 8,
                padding: "var(--space-sm) var(--space-md)",
                borderLeft: "2px solid var(--color-outline-variant)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-xs)" }}>
                <strong style={{ font: "var(--font-label-md)" }}>
                  User
                </strong>
                <span style={{ font: "var(--font-code-sm)", color: "var(--color-outline)" }}>
                  {timeAgo(reply.created_at)}
                </span>
              </div>
              <p style={{ margin: "var(--space-xs) 0", font: "var(--font-body-md)" }}>{reply.content}</p>
              {!reply.is_deleted && (
                <Button variant="ghost" style={{ fontSize: 12, padding: "2px 8px", color: "var(--color-error)" }} onClick={() => deleteComment(reply.id)}>Delete</Button>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
