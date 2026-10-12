import type { Env } from "./types";

const COOKIE_NAME = "wp_session";
const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return toBase64Url(new Uint8Array(signature));
}

export async function createSession(env: Env): Promise<string> {
  const expires = String(Date.now() + 12 * 60 * 60 * 1000);
  const payload = toBase64Url(encoder.encode("admin:" + expires));
  return payload + "." + await sign(payload, env.SESSION_SECRET);
}

export async function isAuthenticated(request: Request, env: Env): Promise<boolean> {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(COOKIE_NAME + "="));
  if (!match) return false;
  const token = decodeURIComponent(match.slice(COOKIE_NAME.length + 1));
  const dot = token.indexOf(".");
  if (dot < 1) return false;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = await sign(payload, env.SESSION_SECRET);
  if (signature.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < signature.length; i++) diff |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return false;
  try {
    const decoded = new TextDecoder().decode(fromBase64Url(payload));
    const [user, expiry] = decoded.split(":");
    return user === "admin" && Number(expiry) > Date.now();
  } catch {
    return false;
  }
}

export function sessionCookie(token: string, secure: boolean): string {
  return COOKIE_NAME + "=" + encodeURIComponent(token) + "; HttpOnly; Secure" + (secure ? "" : "") + "; SameSite=Strict; Path=/; Max-Age=43200";
}

export function clearSessionCookie(): string {
  return COOKIE_NAME + "=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0";
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}

export async function audit(env: Env, action: string, details = ""): Promise<void> {
  await env.DB.prepare("INSERT INTO audit_logs(action, details) VALUES(?, ?)").bind(action, details.slice(0, 1000)).run();
}
