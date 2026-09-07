type TicketNotifyInfo = {
  id: string;
  description: string;
  room_name: string;
  sector_name: string;
  requester_name: string;
  created_at: string;
};

type NtfyRecipient = {
  topic: string;
  admin_name: string | null;
};

/**
 * Envia push ntfy para cada tópico (um por destinatário).
 * Falha silenciosa — abertura do chamado não depende disso.
 */
export async function notifyNtfy(input: {
  ticket: TicketNotifyInfo;
  recipients: NtfyRecipient[];
}): Promise<void> {
  if (input.recipients.length === 0) return;

  const base = (process.env.NTFY_BASE_URL ?? "https://ntfy.sh").replace(
    /\/$/,
    "",
  );
  const token = process.env.NTFY_TOKEN?.trim();
  const timeoutMs = Number(process.env.NTFY_TIMEOUT_MS ?? 5000);
  const clickUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

  const body = [
    `Solicitante: ${input.ticket.requester_name}`,
    `Sala: ${input.ticket.room_name}`,
    `Setor: ${input.ticket.sector_name}`,
    `Descrição: ${input.ticket.description}`,
  ].join("\n");

  await Promise.all(
    input.recipients.map(async (recipient) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch(`${base}/${encodeURIComponent(recipient.topic)}`, {
          method: "POST",
          headers: {
            // Headers HTTP precisam ser ByteString (ASCII). Evitar acentos/em dash.
            Title: "Chamai - novo chamado",
            Priority: "high",
            Tags: "rotating_light,ticket",
            "Content-Type": "text/plain; charset=utf-8",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(clickUrl ? { Click: `${clickUrl}/setor` } : {}),
          },
          body,
          signal: controller.signal,
        });

        if (!res.ok) {
          console.error(
            "NTFY_NOTIFY_HTTP",
            recipient.topic,
            res.status,
            await res.text().catch(() => ""),
          );
        }
      } catch (err) {
        console.error("NTFY_NOTIFY_FAILED", recipient.topic, err);
      } finally {
        clearTimeout(timer);
      }
    }),
  );
}
