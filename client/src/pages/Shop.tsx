import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Check, Plus, Receipt, Search, ShoppingBag } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useScans } from "@/hooks/use-scans";
import { catalog, getProductBrand, type Product } from "@shared/catalog";
import { productsAllowed, resultStateOf } from "@shared/resultB2C";
import { formatF } from "@shared/delivery";
import { productImages } from "@/lib/productImages";
import { cart, useCart } from "@/lib/cart";
import { ensureDermFonts } from "@/components/derm/tokens";
import { cn } from "@/lib/utils";

// ════════════════════════════════════════════════════════════════════════
// Boutique (nouvelle maquette B2C) : accueil « Le bon soin. Pas le hasard. »,
// recherche, catégories, grille, puis « Le soin en détail » (?p=<id>).
// Chaque produit dit pourquoi il est pour vous à partir de données réelles
// (recommandation de votre dernière analyse). Si cette analyse demande un avis
// médical, aucun produit n'est « conseillé ».
// ════════════════════════════════════════════════════════════════════════

const G = { dark: "#164034", text: "#17392c", muted: "#5f6f69", line: "#e3e8e2", sage: "#e7eedc", soft: "#f1f5ec", lime: "#cfe08a" };
const SERIF = "'Lora', Georgia, serif";
const CATS = [
  { key: "all", label: "Tout" },
  { key: "visage", label: "Visage" },
  { key: "corps", label: "Corps" },
  { key: "cheveux", label: "Cheveux" },
] as const;
const CAT_LABEL: Record<string, string> = { visage: "Visage", corps: "Corps", cheveux: "Cheveux" };
const imgOf = (p: Product) => productImages[p.id] || p.image || null;
const firstSentence = (s: string) => (s || "").split(/(?<=[.!?])\s/)[0].slice(0, 110);

function CartButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={`Panier · ${count} article${count > 1 ? "s" : ""}`} className="relative border-0 bg-transparent p-1">
      <ShoppingBag size={22} strokeWidth={1.7} />
      {count > 0 && <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-pill px-1 text-[10.5px] font-bold" style={{ background: G.lime, color: G.dark }}>{count}</span>}
    </button>
  );
}

export default function Shop() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: scans } = useScans();
  const lines = useCart();
  const [cat, setCat] = useState<(typeof CATS)[number]["key"]>("all");
  const [q, setQ] = useState("");
  const [detailId, setDetailId] = useState<string | null>(() => new URLSearchParams(window.location.search).get("p"));
  useEffect(() => { ensureDermFonts(); }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [detailId]);

  const last: any = Array.isArray(scans) && scans.length ? scans[0] : null;
  const full = last?.recommendations?._fullResult;
  const lastState = last ? resultStateOf(full ?? { score: last.score, condition: last.condition }) : null;
  const canRecommend = !!lastState && productsAllowed(lastState);
  const recommended = new Set<string>(canRecommend ? (full?.recommendations?.products ?? []) : []);
  const lastDate = last?.createdAt ? new Date(last.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : null;
  const isReco = (p: Product) => recommended.has(p.name) || recommended.has(p.id);
  const why = (p: Product) => (isReco(p) ? `Conseillé par votre analyse${lastDate ? ` du ${lastDate}` : ""}` : firstSentence(p.description));

  const products = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = catalog.filter((p) => typeof p.price === "number" && p.price > 0
      && (cat === "all" || p.category === cat)
      && (!term || p.name.toLowerCase().includes(term) || (p.description || "").toLowerCase().includes(term) || (p.targets || []).some((t) => t.toLowerCase().includes(term))));
    return [...list].sort((a, b) => Number(isReco(b)) - Number(isReco(a)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, q, canRecommend, full]);

  const count = lines.reduce((a, l) => a + l.qty, 0);
  const subtotal = lines.reduce((a, l) => a + (catalog.find((p) => p.id === l.id)?.price ?? 0) * l.qty, 0);
  const goCart = () => setLocation(user ? "/commande" : "/auth");
  const openDetail = (id: string | null) => {
    setDetailId(id);
    window.history.replaceState(null, "", id ? `/shop?p=${encodeURIComponent(id)}` : "/shop");
  };

  const cartBar = count > 0 && (
    <div className="sticky bottom-[84px] z-40 mx-auto max-w-[480px] px-5 pb-3">
      <button type="button" onClick={goCart}
        className="flex w-full items-center justify-between rounded-[14px] border-0 px-5 py-3.5 text-[15px] font-semibold text-white shadow-organic-md" style={{ background: G.dark }}>
        <span>Voir mon panier · {count} produit{count > 1 ? "s" : ""}</span>
        <span>{formatF(subtotal)}</span>
      </button>
    </div>
  );

  // ══════════ Le soin en détail ══════════
  const detail = detailId ? catalog.find((p) => p.id === detailId) : null;
  if (detailId && detail) {
    const on = lines.some((l) => l.id === detail.id);
    const img = imgOf(detail);
    const brand = getProductBrand(detail);
    return (
      <div className="b2c-theme min-h-screen bg-organic-bg font-body text-organic-text">
        <main className="mx-auto flex max-w-[480px] flex-col pb-6">
          <div className="flex items-center gap-2.5 px-5 pb-3 pt-4" style={{ color: G.dark }}>
            <button type="button" onClick={() => openDetail(null)} aria-label="Retour à la boutique" className="-ml-1 border-0 bg-transparent p-1" style={{ color: G.dark }}>
              <ArrowLeft size={20} strokeWidth={1.9} />
            </button>
            <span className="flex-1 text-[16px] font-semibold" style={{ color: G.text }}>Le soin en détail</span>
            <CartButton count={count} onClick={goCart} />
          </div>

          <div className="relative h-[300px] w-full bg-cover bg-center" style={{ background: G.sage }}>
            {img && <img src={img} alt={detail.name} className="h-full w-full object-cover" />}
            <span className="absolute left-5 top-4 rounded-pill bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[.08em]" style={{ color: G.dark }}>{CAT_LABEL[detail.category] || "Soin"}</span>
          </div>

          <div className="flex flex-col gap-4 px-5 pt-5">
            <div className="flex flex-col gap-2">
              {brand && brand !== "Inconnu" && <span className="text-[11px] font-bold uppercase tracking-[.1em]" style={{ color: G.muted }}>{brand}</span>}
              <div className="flex items-start justify-between gap-3">
                <h1 className="m-0 text-[28px] leading-[1.12]">{detail.name}</h1>
                <b className="flex-none pt-1 font-heading text-[20px] font-bold">{formatF(detail.price!)}</b>
              </div>
              {isReco(detail) && <span className="self-start rounded-pill px-2.5 py-[3px] text-[12px] font-semibold" style={{ background: G.sage, color: G.dark }}>{why(detail)}</span>}
              <p className="m-0 text-[15px] leading-relaxed" style={{ color: G.muted }}>{firstSentence(detail.description)}</p>
              {detail.targets?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {detail.targets.slice(0, 4).map((t) => <span key={t} className="rounded-pill px-3 py-1 text-[12px] font-semibold capitalize" style={{ background: G.sage, color: G.dark }}>{t}</span>)}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5 border-t pt-4" style={{ borderColor: G.line }}>
              <b className="text-[16px] font-semibold">Pourquoi ce soin ?</b>
              <p className="m-0 text-[14.5px] leading-relaxed" style={{ color: G.muted }}>{detail.description}</p>
            </div>

            {detail.usagePoints && detail.usagePoints.length > 0 && (
              <div className="flex flex-col gap-1.5 border-t pt-4" style={{ borderColor: G.line }}>
                <b className="text-[16px] font-semibold">Ce qu'il apporte</b>
                <ul className="m-0 flex flex-col gap-1 pl-5 text-[14.5px] leading-relaxed" style={{ color: G.muted }}>
                  {detail.usagePoints.map((u) => <li key={u}>{u}</li>)}
                </ul>
              </div>
            )}

            <span className="border-t pt-4 text-[13px] leading-relaxed" style={{ borderColor: G.line, color: G.muted }}>
              Arrêtez l'utilisation en cas d'irritation. En cas de doute, demandez conseil à un professionnel de santé.
            </span>

            <button type="button" onClick={() => cart.toggle(detail.id)} data-testid="detail-add"
              className="inline-flex items-center justify-center gap-2 rounded-[12px] border p-4 text-[15px] font-semibold"
              style={on ? { borderColor: G.dark, background: "#fff", color: G.dark } : { borderColor: G.dark, background: G.dark, color: "#fff" }}>
              {on ? <><Check size={17} strokeWidth={2.2} /> Dans votre panier · retirer</> : <>Ajouter au panier · {formatF(detail.price!)}</>}
            </button>
            <span className="-mt-2 text-center text-[12.5px]" style={{ color: G.muted }}>Paiement Mobile Money à l'étape suivante.</span>
          </div>
        </main>
        {cartBar}
      </div>
    );
  }

  // ══════════ Accueil de la boutique ══════════
  const chip = (on: boolean) => cn("whitespace-nowrap rounded-pill border-0 px-4 py-2 text-[13.5px] font-semibold");

  return (
    <div className="b2c-theme min-h-screen bg-organic-bg font-body text-organic-text">
      <div className="text-white" style={{ background: G.dark }}>
        <div className="mx-auto flex max-w-[480px] flex-col gap-3 px-5 pb-7 pt-4">
          <div className="flex items-center justify-between">
            <span className="font-heading text-[19px] font-bold">glowscan / shop</span>
            <CartButton count={count} onClick={goCart} />
          </div>
          <span className="mt-3 text-[11px] font-bold uppercase tracking-[.12em] opacity-80">Le soin, sans le superflu</span>
          <h1 className="m-0 text-[34px] leading-[1.08] text-white">Le bon soin.<br /><span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 500, color: G.lime }}>Pas le hasard.</span></h1>
          <span className="text-[14px] leading-relaxed opacity-85">Des essentiels pour votre routine.<br />Pas une étagère de promesses.</span>
        </div>
      </div>

      <main className="mx-auto flex max-w-[480px] flex-col gap-4 px-5 pb-6 pt-5">
        <label className="flex h-12 items-center gap-2.5 rounded-[12px] border bg-white px-3.5" style={{ borderColor: G.line }}>
          <Search size={18} strokeWidth={1.8} style={{ color: G.muted }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un soin…" aria-label="Rechercher un soin"
            className="h-full flex-1 border-0 bg-transparent text-[15px] outline-none" style={{ color: G.text }} />
        </label>

        <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5">
          {CATS.map((c) => (
            <button key={c.key} type="button" className={chip(cat === c.key)} onClick={() => setCat(c.key)}
              style={{ background: cat === c.key ? G.dark : G.sage, color: cat === c.key ? "#fff" : G.dark }}>{c.label}</button>
          ))}
        </div>

        {lastState && !canRecommend && lastState !== "unusable" && (
          <div className="flex flex-col gap-2 rounded-[16px] p-4" style={{ background: "#f7e8dc", color: "#7a3f1d" }}>
            <b className="text-[15px] font-semibold">Votre dernière analyse demande l'avis d'un dermatologue</b>
            <span className="text-[14px]">GlowScan ne vous conseille aucun produit avant cet avis.</span>
            <button type="button" onClick={() => setLocation("/dermatologues")} className="self-start rounded-[10px] border-0 px-4 py-2 text-[14px] font-semibold text-white" style={{ background: G.dark }}>Consulter un dermatologue</button>
          </div>
        )}

        <div className="flex items-baseline justify-between">
          <h2 className="m-0 text-[22px]">Vos essentiels</h2>
          <span className="text-[12px] font-semibold uppercase tracking-[.06em]" style={{ color: G.muted }}>{products.length} soin{products.length > 1 ? "s" : ""}</span>
        </div>

        {products.length === 0 ? (
          <div className="flex flex-col items-start gap-2 rounded-[16px] border bg-white p-4 text-[14px]" style={{ borderColor: G.line, color: G.muted }}>
            Pour l'instant, aucun soin ne correspond{q ? ` à « ${q} »` : ""}.
            <button type="button" onClick={() => { setQ(""); setCat("all"); }} className="border-0 bg-transparent p-0 text-[14px] font-semibold" style={{ color: G.dark }}>Voir tous les soins →</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((p) => {
              const on = lines.some((l) => l.id === p.id);
              const img = imgOf(p);
              return (
                <div key={p.id} className="flex flex-col gap-1.5">
                  <button type="button" onClick={() => openDetail(p.id)} aria-label={`Voir ${p.name}`} className="relative aspect-[4/3.4] w-full overflow-hidden rounded-[14px] border-0 p-0" style={{ background: G.sage }}>
                    {img && <img src={img} alt="" loading="lazy" className="h-full w-full object-cover" />}
                    {isReco(p) && <span className="absolute left-2 top-2 rounded-pill bg-white px-2 py-0.5 text-[10.5px] font-bold" style={{ color: G.dark }}>Conseillé</span>}
                  </button>
                  <button type="button" onClick={() => openDetail(p.id)} className="border-0 bg-transparent p-0 text-left text-[14.5px] font-semibold leading-snug" style={{ color: G.text }}>{p.name}</button>
                  <span className="line-clamp-2 text-[12px] leading-snug" style={{ color: G.muted }}>{why(p)}</span>
                  <div className="mt-auto flex items-center justify-between pt-1">
                    <b className="font-heading text-[17px] font-bold">{formatF(p.price!)}</b>
                    <button type="button" onClick={() => cart.toggle(p.id)} aria-label={on ? `Retirer ${p.name} du panier` : `Ajouter ${p.name} au panier`}
                      className="flex h-9 w-9 items-center justify-center rounded-[10px] border-0 p-0 text-white" style={{ background: on ? "#2a6b4f" : G.dark }}>
                      {on ? <Check size={17} strokeWidth={2.4} /> : <Plus size={18} strokeWidth={2.2} />}
                    </button>
                  </div>
                  <button type="button" onClick={() => openDetail(p.id)} className="self-start border-0 bg-transparent p-0 text-[13px] font-semibold" style={{ color: G.dark }}>Voir le soin →</button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <div className="mx-auto max-w-[480px] px-5">
        <div className="-mx-5 flex flex-col gap-1.5 px-5 py-5" style={{ background: G.sage }}>
          <span className="text-[24px]" style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 500, color: G.dark }}>Un soin à la fois.</span>
          <span className="text-[13.5px] leading-relaxed" style={{ color: G.muted }}>Introduisez un seul nouveau produit à la fois. Les soins proposés ne remplacent pas une prescription.</span>
        </div>
        <button type="button" onClick={() => setLocation(user ? "/profile" : "/auth")} className="mt-4 flex w-full items-center gap-3 rounded-[14px] border bg-white p-3.5 text-left" style={{ borderColor: G.line, color: G.text }}>
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px]" style={{ background: G.sage, color: G.dark }}><Receipt size={18} strokeWidth={1.7} /></span>
          <span className="flex flex-1 flex-col">
            <b className="text-[14.5px] font-semibold">Mes commandes</b>
            <span className="text-[12.5px]" style={{ color: G.muted }}>Retrouvez vos achats et leur suivi.</span>
          </span>
          <ArrowRight size={17} style={{ color: G.dark }} />
        </button>
        <p className="mb-6 mt-3 text-[12px]" style={{ color: G.muted }}>Catalogue GlowScan. Prix en francs CFA.</p>
      </div>
      {cartBar}
    </div>
  );
}
