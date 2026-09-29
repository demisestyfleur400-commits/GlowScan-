// Types de rendez-vous du portail Derm (colonne appointments.type) — maquette
// « Derm Portal », Agenda. « glowscan » = ancienne valeur des consultations en ligne.

export type ApptType = "online" | "consultation" | "suivi" | "urgence";

export const APPT_TYPES: Record<ApptType, { label: string; bg: string; fg: string; dot: string }> = {
  online: { label: "Consultation en ligne", bg: "var(--color-accent-2-200)", fg: "var(--color-accent-2-900)", dot: "var(--color-accent-2-600)" },
  consultation: { label: "Consultation", bg: "var(--color-neutral-200)", fg: "var(--color-neutral-900)", dot: "var(--color-neutral-600)" },
  suivi: { label: "Suivi", bg: "var(--color-accent-200)", fg: "var(--color-accent-900)", dot: "var(--color-accent-400)" },
  urgence: { label: "Urgence", bg: "var(--color-accent-700)", fg: "var(--color-neutral-100)", dot: "var(--color-accent-700)" },
};

export function apptTypeOf(t?: string | null): ApptType {
  if (t === "glowscan" || t === "online") return "online";
  if (t === "suivi" || t === "urgence") return t;
  return "consultation";
}

/** Fuseau du cabinet : Douala (UTC+1, sans heure d'été). */
export const CABINET_TZ = "Africa/Douala";
export const dayKeyOf = (d: Date) => d.toLocaleDateString("fr-CA", { timeZone: CABINET_TZ });
export const hhmmOf = (d: Date) => d.toLocaleTimeString("fr-FR", { timeZone: CABINET_TZ, hour: "2-digit", minute: "2-digit" });
/** « AAAA-MM-JJ » + « HH:MM » à Douala → ISO UTC. */
export const doualaIso = (day: string, time: string) => new Date(`${day}T${time}:00+01:00`).toISOString();
