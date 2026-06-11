import { useState, useEffect, type FormEvent } from "react";
import api from "../api/client";
import type { Comment } from "../types";

interface Props {
  reportId: string;
  versionId?: string | null;
}

export default function CommentThread({ reportId, versionId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);

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
      alert("Failed to post comment");
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      await api.delete(`/reports/comments/${commentId}`);
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, is_deleted: true, content: "[deleted]" } : c))
      );
    } catch {
      alert("Failed to delete comment");
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <h3>Comments</h3>

      <form onSubmit={postComment} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={replyTo ? "Write a reply..." : "Write a comment..."}
          style={{ flex: 1 }}
        />
        <button type="submit">Post</button>
        {replyTo && <button type="button" onClick={() => setReplyTo(null)}>Cancel Reply</button>}
      </form>

      {topLevel.length === 0 && <p style={{ color: "#888" }}>No comments yet.</p>}

      {topLevel.map((comment) => (
        <div key={comment.id} style={{ marginBottom: 12, padding: 8, borderLeft: "3px solid #ccc" }}>
          <div>
            <strong>User {comment.author_id.slice(0, 8)}</strong>
            <small style={{ marginLeft: 8, color: "#888" }}>
              {new Date(comment.created_at).toLocaleString()}
            </small>
            {comment.version_id && <small style={{ marginLeft: 8, color: "#888" }}>(v{comment.version_id.slice(0, 8)})</small>}
          </div>
          <p style={{ margin: "4px 0" }}>{comment.content}</p>
          <div style={{ display: "flex", gap: 8 }}>
            {!comment.is_deleted && (
              <button onClick={() => setReplyTo(comment.id)} style={{ fontSize: 12 }}>
                Reply
              </button>
            )}
            {!comment.is_deleted && (
              <button onClick={() => deleteComment(comment.id)} style={{ fontSize: 12, color: "red" }}>
                Delete
              </button>
            )}
          </div>

          {replies(comment.id).map((reply) => (
            <div key={reply.id} style={{ marginLeft: 24, marginTop: 8, padding: 8, borderLeft: "2px solid #eee" }}>
              <div>
                <strong>User {reply.author_id.slice(0, 8)}</strong>
                <small style={{ marginLeft: 8, color: "#888" }}>
                  {new Date(reply.created_at).toLocaleString()}
                </small>
              </div>
              <p style={{ margin: "4px 0" }}>{reply.content}</p>
              {!reply.is_deleted && (
                <button onClick={() => deleteComment(reply.id)} style={{ fontSize: 12, color: "red" }}>
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
