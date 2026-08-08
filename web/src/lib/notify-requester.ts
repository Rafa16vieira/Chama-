/**
 * Notifica o solicitante sobre novo comentário (in-app + e-mail/webhook opcional).
 * Nunca lança — o comentário já foi salvo.
 */
export async function notifyRequesterComment(input: {
  requesterId: string;
  requesterEmail: string;
  ticketId: string;
  commentId: string;
  commentBody: string;
  authorName: string;
  roomName: string;
}): Promise<void> {
  const title = "Novo comentário no seu chamado";
  const body = `${input.authorName} comentou (${input.roomName}): ${input.commentBody}`;

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    await admin.from("notifications").insert({
      user_id: input.requesterId,
      ticket_id: input.ticketId,
      comment_id: input.commentId,
      title,
      body,
    });
  } catch (err) {
    console.error("NOTIFICATION_INSERT_FAILED", err);
  }

  const emailUrl = process.env.NOTIFY_EMAIL_WEBHOOK_URL;
  if (!emailUrl) return;

  const secret = process.env.NOTIFY_EMAIL_WEBHOOK_SECRET;
  const timeoutMs = Number(process.env.WHATSAPP_TIMEOUT_MS ?? 5000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    await fetch(emailUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify({
        event: "ticket.comment",
        to: input.requesterEmail,
        subject: title,
        message: body,
        ticket_id: input.ticketId,
        comment_id: input.commentId,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    console.error("COMMENT_EMAIL_NOTIFY_FAILED", err);
  } finally {
    clearTimeout(timer);
  }
}
