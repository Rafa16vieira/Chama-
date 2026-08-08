type NotifyPayload = {
  ticket: {
    id: string;
    description: string;
    room_name: string;
    sector_name: string;
    requester_name: string;
    created_at: string;
  };
  recipients: { whatsapp: string; admin_name: string | null }[];
};

/**
 * Fire-and-forget WhatsApp notify via configurable webhook (Evolution API etc.).
 * Never throws to the caller — ticket creation must succeed even if notify fails.
 */
export async function notifyWhatsApp(payload: NotifyPayload): Promise<void> {
  const url = process.env.WHATSAPP_WEBHOOK_URL;
  if (!url || payload.recipients.length === 0) return;

  const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
  const timeoutMs = Number(process.env.WHATSAPP_TIMEOUT_MS ?? 5000);

  const message = [
    `*Chamaí* — novo chamado`,
    `Solicitante: ${payload.ticket.requester_name}`,
    `Sala: ${payload.ticket.room_name}`,
    `Setor: ${payload.ticket.sector_name}`,
    `Descrição: ${payload.ticket.description}`,
  ].join("\n");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify({
        event: "ticket.created",
        message,
        ...payload,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    console.error("WHATSAPP_NOTIFY_FAILED", err);
  } finally {
    clearTimeout(timer);
  }
}
