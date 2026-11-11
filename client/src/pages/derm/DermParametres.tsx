import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DermShell } from "@/components/derm/DermShell";
import { D, FONT_UI } from "@/components/derm/tokens";
import { Page, ScreenHeader, Card, Btn, Input, Select, Label, Toggle, Chip, Tag, Notice, fr, api } from "@/components/derm/ui";
import { useProAccount } from "@/hooks/use-pro";
import { SecuritySection } from "@/pages/pro/ProCabinet";
import { SPLITS, splitConsultation } from "@shared/splits";
import { RELAY_TIERS } from "@shared/relay";
import { PRO_SUBSCRIPTION_FCFA } from "@shared/premium";
import { opOf, OPERATORS } from "@shared/phone";
import { buildApptJ1Message } from "@shared/whatsappMessages";
import { DEFAULT_SPECIALTY } from "@shared/report";

// ════════════════════════════════════════════════════════════════════════
// Paramètres du cabinet (handoff §3.11). Six sections ; barre d'enregistrement
// collante (active seulement si quelque chose a changé). Le profil alimente
// l'en-tête et la signature de tous les comptes rendus A4 ; l'agenda et les
// rappels pilotent l'Agenda et les envois automatiques.
// ════════════════════════════════════════════════════════════════════════

type Settings = {
  signatureText: string | null; cabinetEmail: string | null; openTime: string; closeTime: string; slotMinutes: number; pauseStart: string | null; pauseEnd: string | null; openDays: number[];
  remindJ1: boolean; remindH2: boolean; remindReport: boolean; remindPhoto: boolean; remindMissed: boolean; priceCabinetFcfa: number | null; priceControlFcfa: number | null;
  photoConsentRequired: boolean; dhis2Aggregate: boolean; glowPreanalysis: boolean; retention20y: boolean;
};
type Profile = { fullName: string; licenseNumber: string; cabinetName: string; cabinetAddress: string; city: string; country: string; cabinetPhone: string; phone: string; specialtyTitle: string; consultPriceFcfa: number | null; b2cAvailable: boolean };
type Resp = { settings: Settings; profile: Profile; dhis2Connected: boolean };
type Sec = "profil" | "equipe" | "agenda" | "tarifs" | "securite" | "donnees";
const DAYS = ["L", "M", "M", "J", "V", "S", "D"];
const F = (n: number) => `${n.toLocaleString("fr-FR")} F`;

function Row({ t, s, on, onChange, disabled, testid }: { t: string; s: string; on: boolean; onChange: (v: boolean) => void; disabled?: boolean; testid?: string }) {
  return (
    <div className="flex items-center justify-between" style={{ gap: 16, padding: "14px 0", borderTop: `1px solid ${D.sep}`, opacity: disabled ? .55 : 1 }} data-testid={testid}>
      <span className="flex flex-col" style={{ gap: 3 }}><b style={{ fontSize: 12.5, fontWeight: 600 }}>{t}</b><span style={{ fontSize: 10.5, color: D.muted }}>{s}</span></span>
      <span style={{ pointerEvents: disabled ? "none" : undefined }}><Toggle on={on} onChange={onChange} label={t} /></span>
    </div>
  );
}
const H = ({ t, s }: { t: string; s: string }) => <div style={{ marginBottom: 6 }}><b style={{ fontSize: 18, fontWeight: 600 }}>{t}</b><p style={{ margin: "4px 0 0", fontSize: 11.5, color: D.muted }}>{s}</p></div>;

function Team() {
  const qc = useQueryClient();
  const { data } = useQuery<{ items: { id: number; fullName: string; email: string; role: string; phone: string | null }[] }>({ queryKey: ["/api/derm/team"] });
  const [f, setF] = useState({ fullName: "", email: "", role: "Secrétaire", phone: "" });
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [msg, setMsg] = useState<{ t: string; tone: "ok" | "err" } | null>(null);
  const [phones, setPhones] = useState<Record<number, string>>({});
  const refresh = () => qc.invalidateQueries({ queryKey: ["/api/derm/team"] });
  const add = async () => {
    const password = Array.from(crypto.getRandomValues(new Uint8Array(10))).map((b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31]).join("");
    try {
      const d = await api<{ secretary: { id: number } }>("/api/pro/secretaries", "POST", { email: f.email.trim(), fullName: f.fullName.trim(), password });
      await api(`/api/derm/team/${d.secretary.id}`, "PATCH", { role: f.role, phone: f.phone });
      setCreated({ email: f.email.trim(), password }); setF({ fullName: "", email: "", role: "Secrétaire", phone: "" }); setOpen(false); refresh();
    } catch (e: any) { setMsg({ t: e.message, tone: "err" }); }
  };
  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <H t="Équipe & accès" s="Les membres de l'accueil enregistrent les patients, l'anamnèse et les photos. Le diagnostic, la signature et le portefeuille restent réservés au médecin." />
      {msg && <Notice tone={msg.tone} onClose={() => setMsg(null)}>{msg.t}</Notice>}
      {created && (
        <div style={{ padding: 14, borderRadius: 8, background: D.tint3, fontSize: 12 }} data-testid="team-created">
          <b>Accès créé.</b> Identifiant : {created.email} · Mot de passe : <code style={{ userSelect: "all" }}>{created.password}</code>
          <p style={{ margin: "6px 0 0", fontSize: 10.5, color: D.muted }}>Transmettez le mot de passe de vive voix : il n'est jamais envoyé sur WhatsApp et ne sera plus affiché.</p>
          <Btn kind="link" onClick={() => setCreated(null)} style={{ marginTop: 6 }}>J'ai noté le mot de passe</Btn>
        </div>
      )}
      {(data?.items || []).map((m) => (
        <div key={m.id} className="flex flex-col" style={{ gap: 8, padding: "12px 0", borderTop: `1px solid ${D.sep}` }}>
          <div className="flex flex-wrap items-center justify-between" style={{ gap: 10 }}>
            <span className="flex flex-col"><b style={{ fontSize: 12.5, fontWeight: 600 }}>{m.fullName}</b><span style={{ fontSize: 10.5, color: D.muted }}>{m.email}</span></span>
            <span className="flex flex-wrap items-center" style={{ gap: 8 }}>
              <Select value={m.role} onChange={async (e) => { await api(`/api/derm/team/${m.id}`, "PATCH", { role: e.target.value }).catch(() => {}); refresh(); }} style={{ height: 32 }}>
                <option>Secrétaire</option><option>Infirmier·e</option>
              </Select>
              <Btn kind="secondary" onClick={async () => { try { const d = await api<{ sent: boolean }>(`/api/derm/team/${m.id}/invite`, "POST", {}); setMsg({ t: d.sent ? "Invitation envoyée sur WhatsApp (lien et identifiant, sans le mot de passe)." : "WhatsApp indisponible pour le moment.", tone: d.sent ? "ok" : "err" }); } catch (e: any) { setMsg({ t: e.message, tone: "err" }); } }} style={{ height: 32 }}>Inviter par WhatsApp</Btn>
              <Btn kind="link" onClick={async () => { if (!window.confirm(`Retirer l'accès de ${m.fullName} ?`)) return; await api(`/api/pro/secretaries/${m.id}`, "DELETE").catch(() => {}); refresh(); }} style={{ color: D.err }}>Retirer</Btn>
            </span>
          </div>
          <span className="flex items-center" style={{ gap: 8 }}>
            <Input value={phones[m.id] ?? m.phone ?? ""} onChange={(e) => setPhones({ ...phones, [m.id]: e.target.value })} placeholder="Téléphone WhatsApp" style={{ maxWidth: 220, height: 32 }} />
            {(phones[m.id] ?? m.phone ?? "") !== (m.phone ?? "") && <Btn kind="link" onClick={async () => { await api(`/api/derm/team/${m.id}`, "PATCH", { phone: phones[m.id] }).catch(() => {}); refresh(); }}>Enregistrer le numéro</Btn>}
          </span>
        </div>
      ))}
      {data && !data.items.length && <span style={{ fontSize: 11.5, color: D.muted }}>Aucun membre pour l'instant.</span>}
      {open ? (
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10, padding: 14, borderRadius: 8, background: "#f3f7f1" }}>
          <Label text="Nom et prénom"><Input value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></Label>
          <Label text="Email (identifiant)"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Label>
          <Label text="Téléphone WhatsApp"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Label>
          <Label text="Rôle"><Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} style={{ width: "100%" }}><option>Secrétaire</option><option>Infirmier·e</option></Select></Label>
          <span className="flex items-end" style={{ gap: 8 }}><Btn kind="secondary" onClick={() => setOpen(false)}>Annuler</Btn><Btn kind="primary" disabled={f.fullName.trim().length < 2 || !/.+@.+\..+/.test(f.email)} onClick={add} data-testid="team-add">Créer l'accès</Btn></span>
        </div>
      ) : <Btn kind="secondary" onClick={() => setOpen(true)} style={{ alignSelf: "flex-start" }}>+ Ajouter un membre</Btn>}
      <div style={{ marginTop: 6, border: `1px solid ${D.border}`, borderRadius: 8, overflow: "hidden" }}>
        <div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr 1fr", padding: "8px 12px", background: "#f3f6f3", fontSize: 9, fontWeight: 700, letterSpacing: .6, color: D.muted }}><span>DROIT</span><span>ACCUEIL</span><span>MÉDECIN</span></div>
        {[["Accueil & photos", true], ["Agenda", true], ["Patients (fiches administratives)", true], ["Diagnostic · signature", false], ["Portefeuille", false], ["Paramètres", false]].map(([t, a]) => (
          <div key={String(t)} className="grid" style={{ gridTemplateColumns: "1.6fr 1fr 1fr", padding: "8px 12px", borderTop: `1px solid ${D.sep}`, fontSize: 11.5 }}><span>{t}</span><span style={{ color: a ? D.action : D.err }}>{a ? "✓" : "✕"}</span><span style={{ color: D.action }}>✓</span></div>
        ))}
      </div>
    </div>
  );
}

function Security() {
  const { data: acc } = useProAccount();
  const qc = useQueryClient();
  const { data: pin } = useQuery<{ set: boolean }>({ queryKey: ["/api/pro/sign-pin"] });
  const { data: ses } = useQuery<{ items: { id: string; current: boolean; ua: string | null; seenAt: string | null; expire: string }[] }>({ queryKey: ["/api/derm/sessions"] });
  const [p, setP] = useState({ cur: "", a: "", b: "" });
  const [msg, setMsg] = useState<{ t: string; tone: "ok" | "err" } | null>(null);
  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 4);
  const save = async () => {
    try { await api("/api/pro/sign-pin", "POST", { pin: p.a, currentPin: pin?.set ? p.cur : undefined }); setP({ cur: "", a: "", b: "" }); setMsg({ t: "Code de signature enregistré.", tone: "ok" }); qc.invalidateQueries({ queryKey: ["/api/pro/sign-pin"] }); }
    catch (e: any) { setMsg({ t: e.message, tone: "err" }); }
  };
  const device = (ua: string | null) => !ua ? "Appareil non identifié (connexion antérieure)" : `${/iPhone|iPad/.test(ua) ? "iPhone / iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Ordinateur Windows" : /Mac OS/.test(ua) ? "Mac" : "Appareil"} · ${/Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "navigateur"}`;
  const ok = p.a.length === 4 && p.a === p.b && (!pin?.set || (p.cur.length === 4 && p.cur !== p.a));
  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <H t="Signature & sécurité" s="Le code à 4 chiffres signe vos comptes rendus. Il n'est jamais demandé à l'accueil." />
      {msg && <Notice tone={msg.tone} onClose={() => setMsg(null)}>{msg.t}</Notice>}
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
        {pin?.set && <Label text="Code actuel"><Input type="password" inputMode="numeric" value={p.cur} onChange={(e) => setP({ ...p, cur: digits(e.target.value) })} /></Label>}
        <Label text="Nouveau code"><Input type="password" inputMode="numeric" value={p.a} onChange={(e) => setP({ ...p, a: digits(e.target.value) })} /></Label>
        <Label text="Confirmer"><Input type="password" inputMode="numeric" value={p.b} onChange={(e) => setP({ ...p, b: digits(e.target.value) })} /></Label>
      </div>
      <span className="flex flex-wrap items-center justify-between" style={{ gap: 8 }}>
        <span style={{ fontSize: 10.5, color: D.muted }}>{pin?.set ? "Le nouveau code doit être différent de l'actuel." : "Aucun code défini : choisissez-en un."}</span>
        <Btn kind="primary" disabled={!ok} onClick={save} data-testid="pin-save">Enregistrer le code</Btn>
      </span>
      <div style={{ paddingTop: 12, borderTop: `1px solid ${D.sep}` }}>
        <b style={{ fontSize: 13, fontWeight: 600 }}>Appareils connectés</b>
        {(ses?.items || []).map((s) => (
          <div key={s.id} className="flex items-center justify-between" style={{ gap: 10, padding: "10px 0", borderBottom: `1px solid ${D.sep}` }}>
            <span className="flex flex-col"><span style={{ fontSize: 12 }}>{device(s.ua)}{s.current ? " · cet appareil" : ""}</span><span style={{ fontSize: 10, color: D.muted }}>{s.seenAt ? `Actif depuis le ${fr(s.seenAt, { day: "numeric", month: "long" })} · ` : ""}expire le {fr(s.expire, { day: "numeric", month: "long" })}</span></span>
            {s.current ? <Tag>Cet appareil</Tag> : <Btn kind="secondary" onClick={async () => { await api(`/api/derm/sessions/${s.id}`, "DELETE").catch(() => {}); qc.invalidateQueries({ queryKey: ["/api/derm/sessions"] }); }} style={{ height: 30 }}>Déconnecter</Btn>}
          </div>
        ))}
      </div>
      <div className="derm-theme" style={{ paddingTop: 12, borderTop: `1px solid ${D.sep}` }}><SecuritySection currentEmail={(acc?.user as any)?.email} /></div>
    </div>
  );
}

function Payouts() {
  const qc = useQueryClient();
  const { data } = useQuery<{ accounts: { id: number; msisdn: string; operator: string; is_primary: boolean }[] }>({ queryKey: ["/api/pro/wallet"] });
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");
  const op = opOf(phone);
  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      <b style={{ fontSize: 13, fontWeight: 600 }}>Numéro Mobile Money (versements)</b>
      {(data?.accounts || []).map((a) => <span key={a.id} style={{ fontSize: 12 }}>{a.msisdn} · {a.operator === "mtn" ? "MTN MoMo" : a.operator === "orange" ? "Orange Money" : a.operator}{a.is_primary ? " · principal" : ""}</span>)}
      <span className="flex flex-wrap items-center" style={{ gap: 8 }}>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="6XX XX XX XX" style={{ maxWidth: 200 }} />
        <span style={{ fontSize: 11, color: D.muted }}>{phone ? (op ? OPERATORS[op].name : "Numéro MTN MoMo ou Orange Money attendu") : ""}</span>
        <Btn kind="secondary" disabled={!op} onClick={async () => { setErr(""); try { await api("/api/pro/payout-accounts", "POST", { phone }); setPhone(""); qc.invalidateQueries({ queryKey: ["/api/pro/wallet"] }); } catch (e: any) { setErr(e.message); } }} style={{ height: 34 }}>Ajouter</Btn>
      </span>
      {err && <span style={{ fontSize: 11, color: D.err }}>{err}</span>}
    </div>
  );
}

export default function DermParametres() {
  const [, go] = useLocation();
  const qc = useQueryClient();
  const { data: acc } = useProAccount();
  const isSecretary = acc?.user?.role === "secretary";
  useEffect(() => { if (isSecretary) go("/derm/agenda"); }, [isSecretary, go]);
  const { data } = useQuery<Resp>({ queryKey: ["/api/derm/settings"], enabled: !!acc && !isSecretary });
  const { data: team } = useQuery<{ items: unknown[] }>({ queryKey: ["/api/derm/team"], enabled: !!acc && !isSecretary });
  const [sec, setSec] = useState<Sec>(() => { try { const s = new URLSearchParams(window.location.search).get("section"); return (["profil", "equipe", "agenda", "tarifs", "securite", "donnees"].includes(s || "") ? s : "profil") as Sec; } catch { return "profil"; } });
  const [s, setS] = useState<Settings | null>(null);
  const [p, setP] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: string; tone: "ok" | "err" } | null>(null);
  useEffect(() => { if (data) { setS(data.settings); setP(data.profile); } }, [data]);
  const dirty = useMemo(() => !!data && !!s && !!p && (JSON.stringify(s) !== JSON.stringify(data.settings) || JSON.stringify(p) !== JSON.stringify(data.profile)), [data, s, p]);
  const up = (patch: Partial<Settings>) => setS((c) => (c ? { ...c, ...patch } : c));
  const upP = (patch: Partial<Profile>) => setP((c) => (c ? { ...c, ...patch } : c));
  const save = async () => {
    if (!s || !p || !data) return;
    setBusy(true); setMsg(null);
    try {
      if (JSON.stringify(p) !== JSON.stringify(data.profile)) {
        await api("/api/pro/account", "PATCH", { fullName: p.fullName, licenseNumber: p.licenseNumber, cabinetName: p.cabinetName, cabinetAddress: p.cabinetAddress, city: p.city, country: p.country,
          cabinetPhone: p.cabinetPhone, phone: p.phone, specialtyTitle: p.specialtyTitle, b2cAvailable: p.b2cAvailable, consultPriceFcfa: p.consultPriceFcfa ? Math.max(500, p.consultPriceFcfa) : undefined });
      }
      if (JSON.stringify(s) !== JSON.stringify(data.settings)) await api("/api/derm/settings", "PUT", { settings: s });
      await qc.invalidateQueries({ queryKey: ["/api/derm/settings"] }); qc.invalidateQueries({ queryKey: ["/api/pro/account"] });
      setMsg({ t: "Modifications enregistrées.", tone: "ok" });
    } catch (e: any) { setMsg({ t: e.message, tone: "err" }); }
    setBusy(false);
  };
  if (!s || !p || !data) return <DermShell active="parametres"><Page><span style={{ fontSize: 12, color: D.muted }}>Chargement des paramètres…</span></Page></DermShell>;

  const op = opOf(p.phone);
  const menu: [Sec, string, string][] = [
    ["profil", "Profil & cabinet", "En-tête des documents"],
    ["equipe", "Équipe & accès", `${(team?.items.length || 0) + 1} membre${(team?.items.length || 0) ? "s" : ""}`],
    ["agenda", "Agenda & rappels", `${s.openTime} – ${s.closeTime}`],
    ["tarifs", "Tarifs & paiements", p.b2cAvailable ? "Consultations en ligne actives" : "Tarifs du cabinet"],
    ["securite", "Signature & sécurité", "Code à 4 chiffres"],
    ["donnees", "Confidentialité & données", "Exports anonymes"],
  ];
  const sample = buildApptJ1Message({ name: "Awa", derm: p.fullName, day: "mardi 3 décembre", time: s.openTime });
  const priceN = p.consultPriceFcfa || 0;

  return (
    <DermShell active="parametres">
      <Page>
        <ScreenHeader kicker="PARAMÈTRES DU CABINET" title="Votre cabinet, à votre façon." sub="Identité, équipe, rappels, tarifs et sécurité. Chaque réglage s'applique à tout l'espace." />
        {msg && <Notice tone={msg.tone} onClose={() => setMsg(null)}>{msg.t}</Notice>}
        <section className="grid items-start" style={{ gridTemplateColumns: "minmax(200px,260px) minmax(0,1fr)", gap: 20, paddingBottom: 110 }}>
          <Card style={{ padding: 8 }}>
            {menu.map(([k, t, sub]) => (
              <button key={k} type="button" onClick={() => { setSec(k); window.history.replaceState(null, "", `/derm/cabinet?section=${k}`); }} className="flex w-full cursor-pointer flex-col text-left" data-testid={`prm-${k}`}
                style={{ gap: 3, padding: "12px 12px", border: 0, borderRadius: 6, background: sec === k ? D.tintChip : "transparent", fontFamily: FONT_UI, color: D.text }}>
                <b style={{ fontSize: 12.5, fontWeight: 600 }}>{t}</b><span style={{ fontSize: 10, color: D.muted }}>{sub}</span>
              </button>
            ))}
            <a href="/derm/cabinet-avance" style={{ display: "block", padding: "10px 12px", fontSize: 10.5, color: D.muted }}>Réglages avancés (abonnement, notifications) →</a>
          </Card>

          <Card style={{ padding: "22px 24px" }}>
            {sec === "profil" && (
              <div className="flex flex-col" style={{ gap: 14 }}>
                <H t="Profil & cabinet" s="Ces informations figurent dans l'en-tête et la signature de tous vos comptes rendus A4." />
                <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
                  <Label text="Nom affiché"><Input value={p.fullName} onChange={(e) => upP({ fullName: e.target.value })} /></Label>
                  <Label text="N° d'ordre (ONMC)"><Input value={p.licenseNumber} onChange={(e) => upP({ licenseNumber: e.target.value })} /></Label>
                  <Label text="Signature (texte)"><Input value={s.signatureText || ""} onChange={(e) => up({ signatureText: e.target.value })} placeholder={`Dr ${p.fullName.replace(/^dr\.?\s*/i, "")}`} /></Label>
                  <Label text="Spécialité (sur les documents)"><Input value={p.specialtyTitle} onChange={(e) => upP({ specialtyTitle: e.target.value })} placeholder={DEFAULT_SPECIALTY} /></Label>
                  <Label text="Nom du cabinet"><Input value={p.cabinetName} onChange={(e) => upP({ cabinetName: e.target.value })} /></Label>
                  <Label text="Adresse"><Input value={p.cabinetAddress} onChange={(e) => upP({ cabinetAddress: e.target.value })} placeholder="Rue, quartier, BP" /></Label>
                  <Label text="Ville"><Input value={p.city} onChange={(e) => upP({ city: e.target.value })} /></Label>
                  <Label text="Pays"><Input value={p.country} onChange={(e) => upP({ country: e.target.value })} /></Label>
                  <Label text="Téléphone du cabinet"><Input value={p.cabinetPhone} onChange={(e) => upP({ cabinetPhone: e.target.value })} /></Label>
                  <Label text="Email du cabinet"><Input type="email" value={s.cabinetEmail || ""} onChange={(e) => up({ cabinetEmail: e.target.value })} /></Label>
                </div>
                <div style={{ padding: 16, borderRadius: 8, border: `1px solid ${D.border}`, background: "#fffdfb" }} data-testid="prm-preview">
                  <div className="flex justify-between" style={{ gap: 16, paddingBottom: 10, borderBottom: "2px solid #1f5c4f" }}>
                    <span className="flex flex-col"><span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: 1, color: D.action }}>DERMATOLOGIE</span><span style={{ font: "500 17px Lora, Georgia, serif" }}>{p.cabinetName || "Nom du cabinet"}</span>
                      <span style={{ fontSize: 9.5, color: D.muted }}>{[p.cabinetAddress, p.city].filter(Boolean).join(" · ") || "Adresse du cabinet"}{p.cabinetPhone || s.cabinetEmail ? ` · ${[p.cabinetPhone && `Tél. ${p.cabinetPhone}`, s.cabinetEmail].filter(Boolean).join(" · ")}` : ""}</span></span>
                    <span className="flex flex-col text-right"><b style={{ fontSize: 11 }}>Dr {p.fullName.replace(/^dr\.?\s*/i, "") || "Prénom NOM"}</b><span style={{ fontSize: 9.5, color: D.muted }}>Dermatologue{p.licenseNumber ? ` · N° d'ordre ONMC : ${p.licenseNumber}` : ""}</span></span>
                  </div>
                  <span style={{ display: "block", marginTop: 8, textAlign: "right", font: "italic 15px Georgia, serif", color: "#1f5c48" }}>{s.signatureText || `Dr ${p.fullName.replace(/^dr\.?\s*/i, "")}`}</span>
                </div>
                <Btn kind="link" onClick={() => window.open("/api/derm/settings/preview-a4", "_blank", "noopener")} style={{ alignSelf: "flex-start" }}>{dirty ? "Enregistrez, puis voyez un compte rendu avec ces informations →" : "Voir un compte rendu avec ces informations →"}</Btn>
              </div>
            )}

            {sec === "equipe" && <Team />}

            {sec === "agenda" && (
              <div className="flex flex-col" style={{ gap: 10 }}>
                <H t="Agenda & rappels" s="Ces horaires règlent la grille de l'Agenda ; les rappels partent automatiquement, sans détail médical." />
                <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
                  <Label text="Ouverture"><Input type="time" step={900} value={s.openTime} onChange={(e) => up({ openTime: e.target.value })} /></Label>
                  <Label text="Fermeture"><Input type="time" step={900} value={s.closeTime} onChange={(e) => up({ closeTime: e.target.value })} /></Label>
                  <Label text="Durée d'un rendez-vous"><Select value={s.slotMinutes} onChange={(e) => up({ slotMinutes: Number(e.target.value) })} style={{ width: "100%" }}>{[15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}</Select></Label>
                  <Label text="Pause (début)"><Input type="time" step={900} value={s.pauseStart || ""} disabled={!s.pauseStart} onChange={(e) => up({ pauseStart: e.target.value })} /></Label>
                  <Label text="Pause (fin)"><Input type="time" step={900} value={s.pauseEnd || ""} disabled={!s.pauseStart} onChange={(e) => up({ pauseEnd: e.target.value })} /></Label>
                </div>
                <label className="flex items-center" style={{ gap: 8, fontSize: 11.5 }}><input type="checkbox" checked={!s.pauseStart} onChange={(e) => up(e.target.checked ? { pauseStart: null, pauseEnd: null } : { pauseStart: "12:00", pauseEnd: "13:00" })} />Pas de pause</label>
                <Label text="Jours d'ouverture">
                  <span className="flex flex-wrap" style={{ gap: 6 }}>{DAYS.map((d, i) => { const n = i + 1, on = s.openDays.includes(n); return <Chip key={n} on={on} onClick={() => up({ openDays: on ? s.openDays.filter((x) => x !== n) : [...s.openDays, n].sort() })}>{d}</Chip>; })}</span>
                </Label>
                <div style={{ marginTop: 6 }}>
                  <Row t="La veille, sur WhatsApp" s="« Répondez 1 pour confirmer » · 18 h" on={s.remindJ1} onChange={(v) => up({ remindJ1: v })} />
                  <Row t="2 heures avant, par SMS" s="Message court avec l'heure" on={s.remindH2} onChange={(v) => up({ remindH2: v })} />
                  <Row t="Compte rendu après la visite" s="Vous rappelle de remettre le compte rendu au patient" on={s.remindReport} onChange={(v) => up({ remindReport: v })} />
                  <Row t="Demande de photo au contrôle" s="Le patient envoie une photo de la zone traitée" on={s.remindPhoto} onChange={(v) => up({ remindPhoto: v })} />
                  <Row t="Relance après un rendez-vous manqué" s="Le lendemain, une seule fois, pour reprendre rendez-vous" on={s.remindMissed} onChange={(v) => up({ remindMissed: v })} testid="prm-missed" />
                </div>
                <div style={{ padding: 14, borderRadius: 8, background: "#e7f3e8", fontSize: 12, whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{sample}</div>
                <span style={{ fontSize: 10, color: D.muted }}>Exemple de rappel : aucun détail médical. Le patient peut répondre ARRÊT SUIVI à tout moment.</span>
              </div>
            )}

            {sec === "tarifs" && (
              <div className="flex flex-col" style={{ gap: 14 }}>
                <H t="Tarifs & paiements" s="Vos tarifs au cabinet sont affichés pour l'accueil ; les consultations en ligne sont payées dans l'application." />
                <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12 }}>
                  <Label text="Consultation au cabinet (FCFA)"><Input inputMode="numeric" value={s.priceCabinetFcfa ?? ""} onChange={(e) => up({ priceCabinetFcfa: e.target.value ? Number(e.target.value.replace(/\D/g, "")) : null })} /></Label>
                  <Label text="Contrôle (FCFA)"><Input inputMode="numeric" value={s.priceControlFcfa ?? ""} onChange={(e) => up({ priceControlFcfa: e.target.value ? Number(e.target.value.replace(/\D/g, "")) : null })} /></Label>
                </div>
                <Row t="Accepter les consultations en ligne" s="Les patients de l'appli GlowScan peuvent vous consulter à distance" on={p.b2cAvailable} onChange={(v) => upP({ b2cAvailable: v })} />
                {p.b2cAvailable && (
                  <div className="flex flex-col" style={{ gap: 6 }}>
                    <Label text="Prix de la consultation en ligne (FCFA)"><Input inputMode="numeric" value={p.consultPriceFcfa ?? ""} onChange={(e) => upP({ consultPriceFcfa: e.target.value ? Number(e.target.value.replace(/\D/g, "")) : null })} style={{ maxWidth: 220 }} /></Label>
                    {priceN > 0 && <span style={{ fontSize: 11, color: D.muted }}>Vous recevez {F(splitConsultation(priceN).pro)} par consultation ({SPLITS.consultation.pro} % ; GlowScan garde {SPLITS.consultation.platform} %).</span>}
                  </div>
                )}
                <div style={{ paddingTop: 12, borderTop: `1px solid ${D.sep}` }}><Payouts /></div>
                <div className="flex flex-col" style={{ gap: 6, padding: 14, borderRadius: 8, background: "#f3f6f3", fontSize: 11.5 }}>
                  <b style={{ fontSize: 12.5, fontWeight: 600 }}>Répartitions fixes</b>
                  <span>Consultation en ligne : {SPLITS.consultation.pro} % pour vous, {SPLITS.consultation.platform} % GlowScan.</span>
                  <span>Avis de télé-expertise : {F(RELAY_TIERS.simple.priceFcfa)} (urgent {F(RELAY_TIERS.urgent.priceFcfa)}), partagé {SPLITS.relay.derm} / {SPLITS.relay.relay} / {SPLITS.relay.platform} (vous, le relais, GlowScan).</span>
                  <span>Consultation au cabinet : 100 % pour vous, réglée directement au cabinet.</span>
                </div>
                <div className="flex flex-wrap items-center justify-between" style={{ gap: 10, padding: 14, borderRadius: 8, background: D.tint3 }}>
                  <span className="flex flex-col"><b style={{ fontSize: 12.5, fontWeight: 600 }}>Abonnement pro · {PRO_SUBSCRIPTION_FCFA.toLocaleString("fr-FR")} FCFA par mois</b>
                    <span style={{ fontSize: 10.5, color: D.muted }}>{(acc as any)?.isTrial ? `Essai gratuit · ${(acc as any)?.daysLeftTrial ?? "?"} jours restants` : "Payé par Mobile Money ou déduit de vos gains."}</span></span>
                  <Btn kind="secondary" onClick={() => go("/derm/cabinet-avance")}>Gérer mon abonnement →</Btn>
                </div>
                <Btn kind="link" onClick={() => go("/derm/portefeuille")} style={{ alignSelf: "flex-start" }}>Ouvrir mon portefeuille →</Btn>
                {op && <span style={{ fontSize: 10, color: D.muted }}>Opérateur de votre numéro personnel : {OPERATORS[op].name}.</span>}
              </div>
            )}

            {sec === "securite" && <Security />}

            {sec === "donnees" && (
              <div className="flex flex-col" style={{ gap: 4 }}>
                <H t="Confidentialité & données" s="Les données de santé restent dans le cabinet. Les exports sont agrégés et anonymes." />
                <Row t="Consentement avant toute photo" s="Demandé à l'accueil et tracé dans le dossier · bloque la prise de photo tant qu'il n'est pas coché" on={s.photoConsentRequired} onChange={(v) => up({ photoConsentRequired: v })} />
                <Row t="Statistiques agrégées vers DHIS2" s={data.dhis2Connected ? "Nombre de cas par pathologie et par mois · jamais de nom" : "Aucune connexion DHIS2 pour votre cabinet : la transmission passe par les programmes ONG"} on={s.dhis2Aggregate && data.dhis2Connected} onChange={(v) => up({ dhis2Aggregate: v })} disabled={!data.dhis2Connected} />
                <Row t="Pré-analyse Glow avant consultation" s="Proposition indicative · le médecin confirme ou corrige. Désactivée : le parcours propose de passer l'analyse" on={s.glowPreanalysis} onChange={(v) => up({ glowPreanalysis: v })} />
                <Row t="Conservation des dossiers 20 ans" s="Durée indicative · à valider selon la réglementation du pays. Rien n'est supprimé automatiquement" on={s.retention20y} onChange={(v) => up({ retention20y: v })} />
                <div className="flex flex-wrap items-center justify-between" style={{ gap: 10, marginTop: 12, padding: 14, borderRadius: 8, background: "#f3f7f1" }}>
                  <span className="flex flex-col"><b style={{ fontSize: 12.5, fontWeight: 600 }}>Exporter mes données d'activité</b><span style={{ fontSize: 10.5, color: D.muted }}>Fichier CSV agrégé par mois et par pathologie · sans nom ni téléphone.</span></span>
                  <a href={`/api/derm/activity/export?month=${new Date().toISOString().slice(0, 7)}`} style={{ padding: "8px 14px", border: `1px solid ${D.borderAlt}`, borderRadius: 4, background: "#fff", color: D.text, fontSize: 12, fontWeight: 600, textDecoration: "none" }} data-testid="prm-csv">Télécharger le CSV</a>
                </div>
              </div>
            )}
          </Card>
        </section>
      </Page>

      <div className="fixed bottom-4 right-6 z-20 md:left-[274px] left-4" style={{ background: "#fff", border: `1px solid ${D.border}`, borderRadius: 12, boxShadow: "0 10px 30px rgba(13,41,41,.1)" }}>
        <div className="flex flex-wrap items-center justify-between" style={{ gap: 12, padding: "14px 18px" }} data-testid="prm-bar">
          <span style={{ fontSize: 12, color: dirty ? D.warn : D.action }}>{dirty ? "Modifications non enregistrées" : "Tous les paramètres sont à jour"}</span>
          <span className="flex" style={{ gap: 10 }}>
            <Btn kind="link" disabled={!dirty || busy} onClick={() => { setS(data.settings); setP(data.profile); }} style={{ color: dirty ? D.text : D.faint }}>Annuler</Btn>
            <Btn kind="primary" disabled={!dirty || busy} onClick={save} data-testid="prm-save">Enregistrer les modifications</Btn>
          </span>
        </div>
      </div>
    </DermShell>
  );
}
