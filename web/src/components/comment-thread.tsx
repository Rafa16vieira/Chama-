"use client";

import type { TicketComment } from "@/lib/types";

export function CommentThread({
  comments,
  emptyLabel = "Nenhum comentário ainda.",
}: {
  comments: TicketComment[];
  emptyLabel?: string;
}) {
  if (comments.length === 0) {
    return <p className="comment-empty">{emptyLabel}</p>;
  }

  return (
    <ul className="comment-list">
      {comments.map((comment) => {
        const author =
          comment.profiles?.full_name?.trim() ||
          comment.profiles?.email ||
          "Admin";
        return (
          <li key={comment.id} className="comment-item">
            <div className="comment-meta">
              <strong>{author}</strong>
              <span>{new Date(comment.created_at).toLocaleString("pt-BR")}</span>
            </div>
            <p className="comment-body">{comment.body}</p>
          </li>
        );
      })}
    </ul>
  );
}
