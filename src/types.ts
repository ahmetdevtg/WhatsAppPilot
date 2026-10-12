export interface Env {
  DB: D1Database;
  SEND_QUEUE: Queue<SendJob>;
  ADMIN_PASSWORD: string;
  SESSION_SECRET: string;
  WHATSAPP_ACCESS_TOKEN: string;
  WHATSAPP_PHONE_NUMBER_ID: string;
  WHATSAPP_VERIFY_TOKEN: string;
  WHATSAPP_API_VERSION?: string;
  APP_NAME?: string;
}

export interface SendJob {
  messageId: number;
  campaignId: number;
  contactId: number;
  phone: string;
  templateName: string;
  languageCode: string;
}

export interface MetaSendResponse {
  messages?: Array<{ id: string; message_status?: string }>;
  error?: { message?: string; type?: string; code?: number; error_subcode?: number };
}
