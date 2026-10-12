import type { Env, SendJob } from "./types";
import { audit, clearSessionCookie, createSession, isAuthenticated, json, sessionCookie } from "./security";
import { normalizePhone, sendTemplate } from "./whatsapp";

const PAGE = String.raw`<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WhatsAppPilot</title>
<style>
:root{color-scheme:dark;--bg:#0b1220;--panel:#121d2e;--line:#26364b;--muted:#9aacc2;--green:#25d366;--text:#edf4fc}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px system-ui,-apple-system,Segoe UI,sans-serif}header{padding:20px 24px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}h1{font-size:22px;margin:0}h2{font-size:17px;margin:0 0 14px}.brand{display:flex;gap:12px;align-items:center}.logo{width:38px;height:38px;border-radius:12px;background:var(--green);color:#042b16;display:grid;place-items:center;font-weight:900;font-size:20px}.muted{color:var(--muted);font-size:13px}.wrap{max-width:1200px;margin:auto;padding:22px}.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:18px}.stat,.panel{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:17px}.stat b{font-size:27px;display:block;margin-top:6px}.columns{display:grid;grid-template-columns:1fr 1fr;gap:16px}.panel{margin-bottom:16px}label{display:block;font-size:13px;color:var(--muted);margin:12px 0 6px}input,select,textarea{width:100%;background:#0b1422;color:var(--text);border:1px solid var(--line);border-radius:9px;padding:11px;font:inherit}textarea{min-height:78px;resize:vertical}button{border:0;border-radius:9px;background:var(--green);color:#052714;font-weight:750;padding:11px 15px;cursor:pointer;margin-top:12px}button.secondary{background:#24364d;color:var(--text)}button:disabled{opacity:.5;cursor:wait}.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.row>*{flex:1}table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--muted);font-weight:600}.tablewrap{overflow:auto}.notice{padding:12px;border:1px solid var(--line);border-radius:10px;margin:12px 0;display:none;white-space:pre-wrap}.ok{border-color:#1b8050;color:#a5f3c5}.err{border-color:#a43d4b;color:#ffb9c0}.check{display:flex;align-items:center;gap:8px}.check input{width:auto}.hidden{display:none!important}@media(max-width:760px){.stats{grid-template-columns:repeat(2,1fr)}.columns{grid-template-columns:1fr}.wrap{padding:14px}header{padding:16px}}
</style></head><body>
<header><div class="brand"><div class="logo">W</div><div><h1>WhatsAppPilot</h1><div class="muted">Resmî WhatsApp Business Cloud API yönetimi</div></div></div><button id="logout" class="secondary hidden">Çıkış yap</button></header>
<div class="wrap"><div id="notice" class="notice"></div>
<section id="login" class="panel" style="max-width:420px;margin:48px auto"><h2>Yönetici girişi</h2><div class="muted">Cloudflare Secret olarak tanımlanan yönetici parolanızı girin.</div><form id="loginForm"><label>Yönetici parolası</label><input id="password" type="password" autocomplete="current-password" required><button type="submit">Giriş yap</button></form></section>
<main id="app" class="hidden">
<div class="stats"><div class="stat"><span class="muted">Toplam kişi</span><b id="sContacts">0</b></div><div class="stat"><span class="muted">İzinli kişi</span><b id="sOpted">0</b></div><div class="stat"><span class="muted">Kampanya</span><b id="sCampaigns">0</b></div><div class="stat"><span class="muted">Gönderilen</span><b id="sSent">0</b></div></div>
<div class="columns"><section class="panel"><h2>Kişi ekle</h2><form id="contactForm"><label>Telefon (ülke koduyla, ör. 905xxxxxxxxx)</label><input id="phone" placeholder="905xxxxxxxxx" required><label>Adı</label><input id="contactName" placeholder="Müşteri adı"><label class="check"><input id="consent" type="checkbox" required> Bu kişi WhatsApp mesajları için açıkça izin verdi.</label><label>İzin kaynağı / kayıt açıklaması</label><input id="consentSource" placeholder="Örn. web formu, 2026-10-12"><button type="submit">Kişiyi kaydet</button></form><hr style="border-color:var(--line);margin:20px 0"><h2>JSON kişi içe aktar</h2><div class="muted">JSON dizi biçimi: phone, name, optedIn, optInSource. Yalnızca izinli kişileri optedIn: true yapın.</div><label>JSON dosyası</label><input type="file" id="importFile" accept=".json,application/json"><button id="importBtn" class="secondary">İçe aktar</button></section>
<section class="panel"><h2>Kampanya oluştur</h2><div class="muted">WhatsApp Manager'da önceden onaylanmış şablon gerekir. Bu sürüm şablon parametreleri içermeyen basit şablon gönderir.</div><form id="campaignForm"><label>Kampanya adı</label><input id="campaignName" required placeholder="Ekim duyurusu"><label>Onaylı şablon adı</label><input id="templateName" required placeholder="kampanya_duyuru"><label>Şablon dili</label><select id="language"><option value="tr">Türkçe (tr)</option><option value="en">English (en)</option><option value="en_US">English (US)</option></select><label class="check"><input id="confirmAudience" type="checkbox" required> Alıcıların izinli olduğunu ve şablonun Meta tarafından onaylandığını doğruluyorum.</label><button type="submit">Kampanya oluştur</button></form><div class="muted" style="margin-top:10px">Oluşturmak gönderim başlatmaz. Önce kampanya listesinde kuyruğa almanız gerekir.</div></section></div>
<section class="panel"><div class="row"><h2 style="margin:0">Kişiler</h2><button id="refresh" class="secondary" style="flex:0 0 auto">Yenile</button></div><div class="tablewrap"><table><thead><tr><th>Telefon</th><th>Ad</th><th>İzin</th><th>Eklenme</th></tr></thead><tbody id="contactsBody"></tbody></table></div></section>
<section class="panel"><h2>Kampanyalar</h2><div class="tablewrap"><table><thead><tr><th>Ad</th><th>Şablon</th><th>Durum</th><th>Toplam</th><th>Gönderilen</th><th>Teslim</th><th>Hata</th><th>İşlem</th></tr></thead><tbody id="campaignsBody"></tbody></table></div></section>
<section class="panel"><h2>Kurulum kontrolü</h2><div id="health" class="muted">Kontrol ediliyor…</div></section>
</main></div>
<script>
const $=id=>document.getElementById(id);const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));function notice(msg,ok=false){const n=$("notice");n.textContent=msg;n.className="notice "+(ok?"ok":"err");n.style.display="block";window.scrollTo({top:0,behavior:"smooth"})}async function api(url,opts={}){const r=await fetch(url,{...opts,headers:{"Content-Type":"application/json",...(opts.headers||{})}});const d=await r.json().catch(()=>({error:"Sunucu cevabı okunamadı"}));if(r.status===401){showLogin();throw Error(d.error||"Oturum süresi doldu.")}if(!r.ok)throw Error(d.error||"İstek başarısız");return d}function showLogin(){ $("login").classList.remove("hidden");$("app").classList.add("hidden");$("logout").classList.add("hidden")}function showApp(){$("login").classList.add("hidden");$("app").classList.remove("hidden");$("logout").classList.remove("hidden");loadAll()}async function loadAll(){try{const [contacts,campaigns,health]=await Promise.all([api("/api/contacts?limit=100"),api("/api/campaigns"),api("/api/health")]);$("sContacts").textContent=contacts.total;$("sOpted").textContent=contacts.optedIn;$("sCampaigns").textContent=campaigns.length;$("sSent").textContent=campaigns.reduce((a,c)=>a+c.sent,0);$("contactsBody").innerHTML=contacts.items.map(c=>"<tr><td>"+esc(c.phone)+"</td><td>"+esc(c.display_name)+"</td><td>"+(c.opted_in?"İzinli":"İzin yok")+"</td><td>"+esc(c.created_at)+"</td></tr>").join("")||"<tr><td colspan=4>Henüz kişi yok.</td></tr>";$("campaignsBody").innerHTML=campaigns.map(c=>"<tr><td>"+esc(c.name)+"</td><td>"+esc(c.template_name)+"</td><td>"+esc(c.status)+"</td><td>"+c.total+"</td><td>"+c.sent+"</td><td>"+c.delivered+"</td><td>"+c.failed+"</td><td>"+(c.status==="draft"?"<button data-queue='"+c.id+"'>Kuyruğa al</button>":"—")+"</td></tr>").join("")||"<tr><td colspan=8>Henüz kampanya yok.</td></tr>";$("health").textContent="API çalışıyor. Cloud API yapılandırması: "+(health.whatsappConfigured?"tanımlı":"eksik")+". D1: hazır.";document.querySelectorAll("[data-queue]").forEach(b=>b.onclick=async()=>{if(!confirm("Bu kampanya yalnızca izinli kişilere sıraya alınacak. Devam edilsin mi?"))return;try{const d=await api("/api/campaigns/"+b.dataset.queue+"/queue",{method:"POST",body:"{}"});notice(d.message,true);loadAll()}catch(e){notice(e.message)}})}catch(e){notice(e.message)}}$("loginForm").onsubmit=async e=>{e.preventDefault();try{await api("/api/login",{method:"POST",body:JSON.stringify({password:$("password").value})});$("password").value="";showApp()}catch(e){notice(e.message)}};$("logout").onclick=async()=>{await api("/api/logout",{method:"POST",body:"{}"}).catch(()=>{});showLogin()};$("contactForm").onsubmit=async e=>{e.preventDefault();try{await api("/api/contacts",{method:"POST",body:JSON.stringify({phone:$("phone").value,name:$("contactName").value,optedIn:$("consent").checked,optInSource:$("consentSource").value})});e.target.reset();notice("Kişi kaydedildi.",true);loadAll()}catch(e){notice(e.message)}};$("campaignForm").onsubmit=async e=>{e.preventDefault();try{const d=await api("/api/campaigns",{method:"POST",body:JSON.stringify({name:$("campaignName").value,templateName:$("templateName").value,languageCode:$("language").value,confirmed:$("confirmAudience").checked})});e.target.reset();notice("Kampanya oluşturuldu. Gönderim başlamadı; listeden kuyruğa alabilirsiniz. ID: "+d.id,true);loadAll()}catch(e){notice(e.message)}};$("importBtn").onclick=async()=>{const f=$("importFile").files[0];if(!f)return notice("Önce JSON dosyası seçin.");try{const rows=JSON.parse(await f.text());if(!Array.isArray(rows))throw Error("JSON içeriği dizi olmalı.");const d=await api("/api/contacts/import",{method:"POST",body:JSON.stringify({contacts:rows})});notice("İçe aktarma tamamlandı. Eklenen/güncellenen: "+d.upserted+", atlanan: "+d.skipped,true);loadAll()}catch(e){notice(e.message)}};$("refresh").onclick=loadAll;api("/api/session").then(()=>showApp()).catch(showLogin);
</script></body></html>`;

function htmlResponse(body: string, status = 200): Response {
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "same-origin", "X-Frame-Options": "DENY" } });
}
function cookieSecure(request: Request): boolean { return new URL(request.url).protocol === "https:"; }
function validTemplate(value: unknown): string {
  const template = String(value ?? "").trim();
  if (!/^[a-z0-9_]{1,512}$/.test(template)) throw new Error("Şablon adı yalnızca küçük harf, rakam ve alt çizgi içermelidir.");
  return template;
}
function validLanguage(value: unknown): string {
  const language = String(value ?? "tr").trim();
  if (!/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(language)) throw new Error("Şablon dili geçersiz.");
  return language;
}
async function requireAuth(request: Request, env: Env): Promise<Response | null> {
  if (!env.SESSION_SECRET || !env.ADMIN_PASSWORD) return json({ error: "ADMIN_PASSWORD ve SESSION_SECRET Cloudflare Secrets olarak tanımlanmalı." }, 503);
  if (!(await isAuthenticated(request, env))) return json({ error: "Oturum gerekli." }, 401);
  return null;
}
async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  if (path === "/api/health" && request.method === "GET") {
    return json({ ok: true, app: env.APP_NAME || "WhatsAppPilot", whatsappConfigured: Boolean(env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID), timestamp: new Date().toISOString() });
  }
  if (path === "/api/login" && request.method === "POST") {
    if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) return json({ error: "Önce ADMIN_PASSWORD ve SESSION_SECRET secret değerlerini tanımlayın." }, 503);
    const body = await request.json().catch(() => ({})) as { password?: string };
    const submitted = String(body.password || "");
    if (!submitted || submitted.length > 512 || submitted !== env.ADMIN_PASSWORD) {
      await audit(env, "login_failed");
      return json({ error: "Parola hatalı." }, 401);
    }
    const token = await createSession(env);
    await audit(env, "login_success");
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Set-Cookie": sessionCookie(token, cookieSecure(request)) } });
  }
  if (path === "/api/logout" && request.method === "POST") return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", "Set-Cookie": clearSessionCookie() } });
  if (path === "/api/session" && request.method === "GET") {
    const auth = await requireAuth(request, env);
    return auth || json({ authenticated: true });
  }
  const auth = await requireAuth(request, env);
  if (auth) return auth;

  if (path === "/api/contacts" && request.method === "GET") {
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 100)));
    const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));
    const [items, counts] = await Promise.all([
      env.DB.prepare("SELECT id, phone, display_name, opted_in, opt_in_source, created_at FROM contacts ORDER BY id DESC LIMIT ? OFFSET ?").bind(limit, offset).all(),
      env.DB.prepare("SELECT COUNT(*) AS total, COALESCE(SUM(opted_in),0) AS optedIn FROM contacts").first<{total:number;optedIn:number}>()
    ]);
    return json({ items: items.results, total: counts?.total || 0, optedIn: counts?.optedIn || 0 });
  }
  if (path === "/api/contacts" && request.method === "POST") {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    let phone: string;
    try { phone = normalizePhone(body.phone); } catch (error) { return json({ error: String((error as Error).message) }, 400); }
    const optedIn = body.optedIn === true;
    const source = String(body.optInSource || "").trim().slice(0, 300);
    if (optedIn && !source) return json({ error: "İzin kaynağını kaydedin (ör. web formu veya müşteri onayı)." }, 400);
    await env.DB.prepare("INSERT INTO contacts(phone, display_name, opted_in, opt_in_source, opt_in_at, opted_out_at, updated_at) VALUES(?,?,?,?,CASE WHEN ?=1 THEN datetime('now') ELSE NULL END, NULL, datetime('now')) ON CONFLICT(phone) DO UPDATE SET display_name=excluded.display_name, opted_in=excluded.opted_in, opt_in_source=excluded.opt_in_source, opt_in_at=CASE WHEN excluded.opted_in=1 THEN COALESCE(contacts.opt_in_at, datetime('now')) ELSE contacts.opt_in_at END, opted_out_at=CASE WHEN excluded.opted_in=0 THEN datetime('now') ELSE NULL END, updated_at=datetime('now')").bind(phone, String(body.name || "").slice(0,120), optedIn ? 1 : 0, source, optedIn ? 1 : 0).run();
    await audit(env, "contact_upsert", phone + "; optedIn=" + optedIn);
    return json({ ok: true });
  }
  if (path === "/api/contacts/import" && request.method === "POST") {
    const body = await request.json().catch(() => ({})) as { contacts?: Array<Record<string, unknown>> };
    if (!Array.isArray(body.contacts) || body.contacts.length > 5000) return json({ error: "contacts dizisi gerekli; tek seferde en fazla 5000 satır." }, 400);
    let upserted = 0, skipped = 0;
    for (const row of body.contacts) {
      try {
        const phone = normalizePhone(row.phone);
        const optedIn = row.optedIn === true;
        const source = String(row.optInSource || "").trim().slice(0,300);
        if (optedIn && !source) { skipped++; continue; }
        await env.DB.prepare("INSERT INTO contacts(phone, display_name, opted_in, opt_in_source, opt_in_at, updated_at) VALUES(?,?,?,?,CASE WHEN ?=1 THEN datetime('now') ELSE NULL END,datetime('now')) ON CONFLICT(phone) DO UPDATE SET display_name=excluded.display_name, opted_in=excluded.opted_in, opt_in_source=excluded.opt_in_source, opt_in_at=CASE WHEN excluded.opted_in=1 THEN COALESCE(contacts.opt_in_at,datetime('now')) ELSE contacts.opt_in_at END, opted_out_at=CASE WHEN excluded.opted_in=0 THEN datetime('now') ELSE NULL END, updated_at=datetime('now')").bind(phone,String(row.name||"").slice(0,120),optedIn?1:0,source,optedIn?1:0).run();
        upserted++;
      } catch { skipped++; }
    }
    await audit(env, "contacts_import", "upserted=" + upserted + "; skipped=" + skipped);
    return json({ upserted, skipped });
  }
  if (path === "/api/campaigns" && request.method === "GET") {
    const { results } = await env.DB.prepare("SELECT id,name,template_name,language_code,status,total,sent,delivered,read_count,failed,created_at,started_at,completed_at FROM campaigns ORDER BY id DESC LIMIT 100").all();
    return json(results);
  }
  if (path === "/api/campaigns" && request.method === "POST") {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const name = String(body.name || "").trim().slice(0,120);
    if (!name) return json({ error: "Kampanya adı gerekli." },400);
    if (body.confirmed !== true) return json({ error: "Alıcı izni ve onaylı şablon doğrulaması gerekli." },400);
    let templateName: string, languageCode: string;
    try { templateName = validTemplate(body.templateName); languageCode = validLanguage(body.languageCode); } catch(error) { return json({error:String((error as Error).message)},400); }
    const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM contacts WHERE opted_in=1 AND opted_out_at IS NULL").first<{n:number}>();
    if (!count?.n) return json({ error: "Gönderime uygun izinli kişi bulunamadı." },400);
    const result = await env.DB.prepare("INSERT INTO campaigns(name,template_name,language_code,total,status) VALUES(?,?,?,?,'draft')").bind(name,templateName,languageCode,count.n).run();
    await audit(env,"campaign_create","id="+result.meta.last_row_id+"; audience="+count.n);
    return json({ id: result.meta.last_row_id, total: count.n },201);
  }
  const queueMatch = path.match(/^\/api\/campaigns\/(\d+)\/queue$/);
  if (queueMatch && request.method === "POST") {
    const id = Number(queueMatch[1]);
    const campaign = await env.DB.prepare("SELECT * FROM campaigns WHERE id=?").bind(id).first<{id:number;name:string;template_name:string;language_code:string;status:string}>();
    if (!campaign) return json({ error: "Kampanya bulunamadı." },404);
    if (campaign.status !== "draft") return json({ error: "Yalnızca taslak kampanya kuyruğa alınabilir." },409);
    const contacts = await env.DB.prepare("SELECT id,phone FROM contacts WHERE opted_in=1 AND opted_out_at IS NULL ORDER BY id").all<{id:number;phone:string}>();
    if (!contacts.results.length) return json({error:"İzinli kişi yok."},400);
    await env.DB.prepare("UPDATE campaigns SET status='queued', total=?, started_at=datetime('now') WHERE id=? AND status='draft'").bind(contacts.results.length,id).run();
    let enqueued = 0;
    try {
      for (const contact of contacts.results) {
        const result = await env.DB.prepare("INSERT OR IGNORE INTO campaign_messages(campaign_id,contact_id,phone,status) VALUES(?,?,?,'queued')").bind(id,contact.id,contact.phone).run();
        if (result.meta.changes) {
          const row = await env.DB.prepare("SELECT id FROM campaign_messages WHERE campaign_id=? AND contact_id=?").bind(id,contact.id).first<{id:number}>();
          if (row) {
            const job: SendJob = { messageId: row.id, campaignId: id, contactId: contact.id, phone: contact.phone, templateName: campaign.template_name, languageCode: campaign.language_code };
            await env.SEND_QUEUE.send(job);
            enqueued++;
          }
        }
      }
    } catch (error) {
      await audit(env,"campaign_queue_partial_failure","id="+id+"; enqueued="+enqueued+"; error="+String(error).slice(0,200));
      return json({error:"Kuyruğa alma yarıda kaldı; aynı kampanyayı tekrar kuyruğa almayın. Hata: "+String(error).slice(0,160),enqueued},503);
    }
    await audit(env,"campaign_queued","id="+id+"; messages="+enqueued);
    return json({ok:true,enqueued,message:"Kampanya sıraya alındı. Sağlayıcı limitleri ve şablon kuralları geçerlidir."});
  }
  if (path === "/api/logs" && request.method === "GET") {
    const {results}=await env.DB.prepare("SELECT action,details,created_at FROM audit_logs ORDER BY id DESC LIMIT 100").all();
    return json(results);
  }
  return json({ error: "API endpoint bulunamadı." },404);
}

async function handleWebhook(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "GET") {
    const mode=url.searchParams.get("hub.mode"), token=url.searchParams.get("hub.verify_token"), challenge=url.searchParams.get("hub.challenge");
    if(mode==="subscribe" && token && token===env.WHATSAPP_VERIFY_TOKEN && challenge) return new Response(challenge,{status:200,headers:{"Content-Type":"text/plain"}});
    return new Response("Webhook verification failed",{status:403});
  }
  if (request.method !== "POST") return new Response("Method not allowed",{status:405});
  const payload = await request.json().catch(()=>null) as any;
  if (!payload || payload.object !== "whatsapp_business_account") return json({received:true});
  for (const entry of payload.entry || []) for (const change of entry.changes || []) {
    const value=change.value || {};
    for (const message of value.messages || []) {
      const phone=String(message.from||"").replace(/\D/g,"");
      const text=String(message.text?.body||"").trim().toLowerCase();
      if(phone && /^(stop|unsubscribe|cancel|quit|dur|iptal|çık|cik)$/.test(text)) {
        await env.DB.prepare("UPDATE contacts SET opted_in=0,opted_out_at=datetime('now'),updated_at=datetime('now') WHERE phone=?").bind(phone).run();
        await audit(env,"contact_opt_out",phone);
      }
    }
    for (const status of value.statuses || []) {
      const providerId=String(status.id||"");
      if(!providerId) continue;
      const state=String(status.status||"");
      const mapped=state==="sent"?"sent":state==="delivered"?"delivered":state==="read"?"read":state==="failed"?"failed":null;
      if(!mapped) continue;
      await env.DB.prepare("UPDATE campaign_messages SET status=?, error=CASE WHEN ?='failed' THEN ? ELSE error END, updated_at=datetime('now') WHERE provider_message_id=?").bind(mapped,mapped,JSON.stringify(status.errors||[]).slice(0,500),providerId).run();
      await env.DB.prepare("UPDATE campaigns SET sent=(SELECT COUNT(*) FROM campaign_messages WHERE campaign_id=campaigns.id AND status IN ('sent','delivered','read')), delivered=(SELECT COUNT(*) FROM campaign_messages WHERE campaign_id=campaigns.id AND status IN ('delivered','read')), read_count=(SELECT COUNT(*) FROM campaign_messages WHERE campaign_id=campaigns.id AND status='read'), failed=(SELECT COUNT(*) FROM campaign_messages WHERE campaign_id=campaigns.id AND status='failed') WHERE id=(SELECT campaign_id FROM campaign_messages WHERE provider_message_id=? LIMIT 1)").bind(providerId).run();
    }
  }
  return json({received:true});
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/") return htmlResponse(PAGE);
    if (url.pathname === "/webhook") return handleWebhook(request,env);
    if (url.pathname.startsWith("/api/")) {
      try { return await handleApi(request,env); }
      catch(error) { console.error("API_ERROR",url.pathname,String(error)); return json({error:"İşlem sırasında hata oluştu. Worker loglarını kontrol edin."},500); }
    }
    return new Response("Not found",{status:404});
  },
  async queue(batch: MessageBatch<SendJob>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      const job=message.body;
      try {
        const current=await env.DB.prepare("SELECT c.opted_in,c.opted_out_at,m.status FROM contacts c JOIN campaign_messages m ON m.contact_id=c.id WHERE m.id=?").bind(job.messageId).first<{opted_in:number;opted_out_at:string|null;status:string}>();
        if(!current || current.opted_in!==1 || current.opted_out_at || current.status!=="queued") {
          await env.DB.prepare("UPDATE campaign_messages SET status='skipped',updated_at=datetime('now') WHERE id=?").bind(job.messageId).run();
          message.ack();
          continue;
        }
        await env.DB.prepare("UPDATE campaigns SET status='sending' WHERE id=? AND status='queued'").bind(job.campaignId).run();
        await env.DB.prepare("UPDATE campaign_messages SET attempts=attempts+1,updated_at=datetime('now') WHERE id=?").bind(job.messageId).run();
        const providerId=await sendTemplate(env,job.phone,job.templateName,job.languageCode);
        await env.DB.prepare("UPDATE campaign_messages SET status='sent',provider_message_id=?,error=NULL,updated_at=datetime('now') WHERE id=?").bind(providerId,job.messageId).run();
        await env.DB.prepare("UPDATE campaigns SET sent=(SELECT COUNT(*) FROM campaign_messages WHERE campaign_id=campaigns.id AND status IN ('sent','delivered','read')),delivered=(SELECT COUNT(*) FROM campaign_messages WHERE campaign_id=campaigns.id AND status IN ('delivered','read')),read_count=(SELECT COUNT(*) FROM campaign_messages WHERE campaign_id=campaigns.id AND status='read'),failed=(SELECT COUNT(*) FROM campaign_messages WHERE campaign_id=campaigns.id AND status='failed') WHERE id=?").bind(job.campaignId).run();
        message.ack();
      } catch(error) {
        const messageText=String(error instanceof Error?error.message:error).slice(0,300);
        const row=await env.DB.prepare("SELECT attempts FROM campaign_messages WHERE id=?").bind(job.messageId).first<{attempts:number}>();
        if((row?.attempts||0)>=5) {
          await env.DB.prepare("UPDATE campaign_messages SET status='failed',error=?,updated_at=datetime('now') WHERE id=?").bind(messageText,job.messageId).run();
          await env.DB.prepare("UPDATE campaigns SET failed=(SELECT COUNT(*) FROM campaign_messages WHERE campaign_id=campaigns.id AND status='failed') WHERE id=?").bind(job.campaignId).run();
          message.ack();
        } else {
          console.error("WHATSAPP_SEND_RETRY",{campaignId:job.campaignId,messageId:job.messageId,error:messageText});
          message.retry({delaySeconds:Math.min(300,10*(row?.attempts||1))});
        }
      }
    }
  }
};
