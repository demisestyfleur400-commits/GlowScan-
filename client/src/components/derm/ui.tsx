import { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ButtonHTMLAttributes } from "react";
import { D, FONT_UI } from "./tokens";

// ════════════════════════════════════════════════════════════════════════
// Briques visuelles de l'espace médical (handoff §5) : en-tête d'écran,
// cartes, boutons, champs, onglets, interrupteur, étiquettes.
// ════════════════════════════════════════════════════════════════════════

export function Page({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return <div style={{ maxWidth: wide ? 1480 : 1240, margin: "auto", padding: "30px 32px 40px", color: D.text, fontFamily: FONT_UI }}>{children}</div>;
}

export function ScreenHeader({ kicker, title, sub, actions }: { kicker: ReactNode; title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between" style={{ gap: 16, marginBottom: 20 }}>
      <div className="min-w-0">
        <span style={{ display: "block", color: D.action, fontSize: 10, fontWeight: 700, letterSpacing: .4 }}>{kicker}</span>
        <h1 style={{ margin: "10px 0 8px", font: "600 31px/1.1 'DM Sans',sans-serif", letterSpacing: -.6, color: D.text }}>{title}</h1>
        {sub && <p style={{ margin: 0, color: D.muted, fontSize: 13 }}>{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center" style={{ gap: 12 }}>{actions}</div>}
    </div>
  );
}

export function Card({ children, style, className, testid }: { children: ReactNode; style?: React.CSSProperties; className?: string; testid?: string }) {
  return <div data-testid={testid} className={className} style={{ background: "#fff", border: `1px solid ${D.border}`, borderRadius: 12, padding: "20px 22px", ...style }}>{children}</div>;
}

export function StatCard({ label, value, sub, tone = "light", onClick, testid }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "light" | "dark" | "warn"; onClick?: () => void; testid?: string }) {
  const dark = tone === "dark", warn = tone === "warn";
  const bg = dark ? "#17392c" : warn ? "#fbf5e6" : "#fff";
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick} data-testid={testid} className={`flex flex-col text-left ${onClick ? "cursor-pointer" : ""}`}
      style={{ gap: 8, padding: "20px 18px", borderRadius: 12, background: bg, border: `1px solid ${dark ? "#17392c" : warn ? "#ecdcb4" : D.border}`, color: dark ? "#fff" : D.text, fontFamily: FONT_UI }}>
      <span style={{ fontSize: 10, color: dark ? "#d7e4dd" : D.muted }}>{label}</span>
      <b style={{ fontSize: 26, fontWeight: 600, letterSpacing: -.5, color: warn ? "#9a6a14" : dark ? "#fff" : D.text }}>{value}</b>
      {sub && <span style={{ fontSize: 9.5, color: dark ? "#d7e4dd" : D.muted }}>{sub}</span>}
    </Tag>
  );
}

type BtnKind = "primary" | "secondary" | "link" | "dark";
export function Btn({ kind = "primary", children, style, ...rest }: { kind?: BtnKind } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const base: React.CSSProperties = { fontFamily: FONT_UI, cursor: rest.disabled ? "not-allowed" : "pointer", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 };
  const k: Record<BtnKind, React.CSSProperties> = {
    primary: { height: 38, padding: "0 18px", border: 0, borderRadius: 4, background: rest.disabled ? "#d5ddd9" : D.action, color: rest.disabled ? D.faint : "#fff", fontSize: 12, fontWeight: 600 },
    dark: { height: 38, padding: "0 18px", border: 0, borderRadius: 4, background: "#17392c", color: "#fff", fontSize: 12, fontWeight: 600, opacity: rest.disabled ? .45 : 1 },
    secondary: { height: 38, padding: "0 16px", border: `1px solid ${D.borderAlt}`, borderRadius: 4, background: "#fff", color: D.text, fontSize: 12, fontWeight: 600, opacity: rest.disabled ? .45 : 1 },
    link: { height: "auto", padding: 0, border: 0, background: "none", color: D.action, fontSize: 11, fontWeight: 600, opacity: rest.disabled ? .45 : 1 },
  };
  return <button type="button" {...rest} style={{ ...base, ...k[kind], ...style }}>{children}</button>;
}

export function Label({ children, text }: { children: ReactNode; text: ReactNode }) {
  return <label className="flex min-w-0 flex-col" style={{ gap: 5, fontSize: 9.5, color: D.muted, fontFamily: FONT_UI }}>{text}{children}</label>;
}
const fieldStyle: React.CSSProperties = { height: 36, padding: "0 10px", background: D.field, border: `1px solid ${D.border}`, borderRadius: 4, fontSize: 11.5, color: D.text, outline: "none", fontFamily: FONT_UI, minWidth: 0, width: "100%", boxSizing: "border-box" };
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...fieldStyle, ...props.style }} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} style={{ ...fieldStyle, background: "#fff", width: "auto", ...props.style }} />;
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} style={{ ...fieldStyle, height: "auto", minHeight: 70, padding: "9px 10px", lineHeight: 1.5, resize: "vertical", ...props.style }} />;
}

export function Tag({ children, tone = "ok" }: { children: ReactNode; tone?: "ok" | "draft" | "muted" | "warn" | "err" | "info" }) {
  const t = { ok: ["#eaf2e5", D.action], draft: ["#f6efd9", "#7a5a12"], muted: ["#f0f1ee", D.muted], warn: [D.warnBg, D.warn], err: [D.errBg, D.err], info: [D.infoBg, D.info] }[tone];
  return <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: 3, background: t[0], color: t[1], fontSize: 9.5, fontWeight: 600, whiteSpace: "nowrap" }}>{children}</span>;
}

export function Chip({ on, children, onClick }: { on: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className="cursor-pointer"
      style={{ height: 30, padding: "0 12px", borderRadius: 999, border: `1px solid ${on ? "#9dc3a9" : D.border}`, background: on ? D.tintChip : "#fff", color: D.text, fontSize: 11, fontWeight: on ? 600 : 500, fontFamily: FONT_UI }}>
      {children}
    </button>
  );
}

export function Tabs<K extends string>({ items, value, onChange, underline }: { items: [K, string][]; value: K; onChange: (k: K) => void; underline?: boolean }) {
  return (
    <div className="flex flex-wrap" style={{ gap: underline ? 18 : 4, borderBottom: underline ? `1px solid ${D.sep}` : 0 }}>
      {items.map(([k, l]) => {
        const on = k === value;
        return underline ? (
          <button key={k} type="button" onClick={() => onChange(k)} className="cursor-pointer" data-testid={`tab-${k}`}
            style={{ padding: "8px 2px 10px", border: 0, borderBottom: `2px solid ${on ? D.action : "transparent"}`, background: "none", color: on ? D.text : D.muted, fontWeight: on ? 600 : 500, fontSize: 11, fontFamily: FONT_UI }}>{l}</button>
        ) : (
          <button key={k} type="button" onClick={() => onChange(k)} className="cursor-pointer" data-testid={`tab-${k}`}
            style={{ height: 32, padding: "0 12px", border: 0, borderRadius: 999, background: on ? D.tintChip : "transparent", color: on ? D.text : D.muted, fontWeight: on ? 600 : 500, fontSize: 11, fontFamily: FONT_UI }}>{l}</button>
        );
      })}
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className="relative flex-none cursor-pointer"
      style={{ width: 38, height: 22, borderRadius: 999, border: 0, background: on ? D.actionDark : "#d6ddd8", transition: "background .15s" }}>
      <span style={{ position: "absolute", top: 3, left: on ? 19 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
    </button>
  );
}

export function Notice({ children, tone = "ok", onClose }: { children: ReactNode; tone?: "ok" | "warn" | "err"; onClose?: () => void }) {
  const t = { ok: [D.tint3, D.actionDark], warn: [D.warnBg, D.warn], err: [D.errBg, D.err] }[tone];
  return (
    <div className="flex items-center justify-between" style={{ gap: 12, padding: "11px 14px", borderRadius: 8, background: t[0], color: t[1], fontSize: 11.5, marginBottom: 14 }}>
      <span>{children}</span>
      {onClose && <Btn kind="link" onClick={onClose} style={{ color: t[1] }}>Fermer</Btn>}
    </div>
  );
}

export const fr = (v: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) =>
  v ? new Date(v).toLocaleDateString("fr-FR", opts) : "—";
export const sexLabel = (s: string | null | undefined) => (s === "F" ? "Femme" : s === "M" ? "Homme" : "Sexe non renseigné");
export const profil = (age: number | null | undefined, sex: string | null | undefined) =>
  [age ? `${age} ans` : "Âge non renseigné", sexLabel(sex)].join(" · ");
export const phoneFmt = (p: string | null | undefined) => {
  if (!p) return "Non renseigné";
  const d = p.replace(/\D/g, "");
  if (d.startsWith("237") && d.length === 12) return `+237 ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`;
  return `+${d}`;
};

/** Requête JSON de l'espace médical (cookies de session). */
export async function api<T = any>(url: string, method = "GET", body?: unknown): Promise<T> {
  const r = await fetch(url, { method, credentials: "include", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(d?.message || "Erreur"), { code: d?.code, status: r.status });
  return d as T;
}
