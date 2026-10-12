import type { Env, MetaSendResponse } from "./types";

export async function sendTemplate(env: Env, phone: string, templateName: string, languageCode: string): Promise<string> {
  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    throw new Error("WhatsApp Cloud API secrets are not configured.");
  }
  const version = env.WHATSAPP_API_VERSION || "v23.0";
  const response = await fetch("https://graph.facebook.com/" + version + "/" + env.WHATSAPP_PHONE_NUMBER_ID + "/messages", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + env.WHATSAPP_ACCESS_TOKEN,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phone,
      type: "template",
      template: { name: templateName, language: { code: languageCode } }
    })
  });
  const body = await response.json() as MetaSendResponse;
  if (!response.ok || body.error) {
    const message = body.error?.message || "WhatsApp API HTTP " + response.status;
    throw new Error(message.slice(0, 300));
  }
  const id = body.messages?.[0]?.id;
  if (!id) throw new Error("WhatsApp API did not return a message ID.");
  return id;
}

export function normalizePhone(value: unknown): string {
  const phone = String(value ?? "").replace(/[\s().-]/g, "").replace(/^\+/, "");
  if (!/^\d{8,15}$/.test(phone)) throw new Error("Telefon numarası ülke koduyla birlikte 8–15 rakam olmalıdır.");
  return phone;
}
