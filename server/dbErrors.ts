/** Colonne absente (code PostgreSQL 42703 « undefined_column ») : migration pas encore appliquée. */
export function isMissingColumnError(err: any): boolean {
  const e = err?.cause ?? err;
  return e?.code === "42703" || /column .* does not exist/i.test(String(e?.message || err?.message || ""));
}

export const ORDERS_MIGRATION_HINT =
  "lancez migrations/0015_orders_followups.sql (voir README, « Ordre des migrations »)";
