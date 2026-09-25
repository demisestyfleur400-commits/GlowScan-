import { useSyncExternalStore } from "react";

// ════════════════════════════════════════════════════════════════════════
// Panier patient (Boutique → Commande). Conservé dans le navigateur ; les prix
// ne sont PAS stockés ici : le total est recalculé et figé par le serveur à
// l'envoi de la commande (catalogue + frais de la ville).
// ════════════════════════════════════════════════════════════════════════

export type CartLine = { id: string; qty: number };
const KEY = "glowscan_cart_v1";
const listeners = new Set<() => void>();

function read(): CartLine[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.filter((l) => l && typeof l.id === "string" && l.qty > 0) : [];
  } catch { return []; }
}
let snapshot: CartLine[] = typeof window !== "undefined" ? read() : [];

function write(next: CartLine[]) {
  snapshot = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* stockage indisponible : panier en mémoire */ }
  listeners.forEach((l) => l());
}

export const cart = {
  get: () => snapshot,
  has: (id: string) => snapshot.some((l) => l.id === id),
  add: (id: string) => write(snapshot.some((l) => l.id === id) ? snapshot : [...snapshot, { id, qty: 1 }]),
  remove: (id: string) => write(snapshot.filter((l) => l.id !== id)),
  toggle: (id: string) => (cart.has(id) ? cart.remove(id) : cart.add(id)),
  setQty: (id: string, qty: number) => write(qty <= 0 ? snapshot.filter((l) => l.id !== id) : snapshot.map((l) => (l.id === id ? { ...l, qty: Math.min(20, qty) } : l))),
  clear: () => write([]),
};

export function useCart(): CartLine[] {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => snapshot,
    () => snapshot,
  );
}
