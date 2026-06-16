/**
 * useSEO — Hook SEO dynamique pour GlowScan (SPA Vite/React)
 * Met à jour title, métas, canonical et OG tags via DOM sans dépendance externe.
 * À appeler au top de chaque page avec les données spécifiques à cette page.
 *
 * Usage :
 *   useSEO({
 *     title: "Analyser ma peau — GlowScan",
 *     description: "Faites votre diagnostic peau IA gratuit en 30 secondes.",
 *     canonical: "https://glow-scan.com/analyze",
 *   });
 */

import { useEffect } from "react";

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  noIndex?: boolean;
}

const DEFAULT_OG_IMAGE = "https://glow-scan.com/logo-glowscan-square.jpeg";
const SITE_NAME = "GlowScan";

function setMetaName(name: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
}

function setMetaProperty(property: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setCanonical(url: string) {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = url;
}

export function useSEO({
  title,
  description,
  canonical,
  ogTitle,
  ogDescription,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  noIndex = false,
}: SEOProps) {
  useEffect(() => {
    // Title
    document.title = title;

    // Description & robots
    setMetaName("description", description);
    setMetaName("robots", noIndex ? "noindex, nofollow" : "index, follow, max-image-preview:large");

    // Canonical
    if (canonical) {
      setCanonical(canonical);
    }

    // Open Graph
    setMetaProperty("og:title", ogTitle || title);
    setMetaProperty("og:description", ogDescription || description);
    setMetaProperty("og:image", ogImage);
    setMetaProperty("og:url", canonical || window.location.href);
    setMetaProperty("og:type", ogType);
    setMetaProperty("og:site_name", SITE_NAME);
    setMetaProperty("og:locale", "fr_FR");

    // Twitter Card
    setMetaName("twitter:title", ogTitle || title);
    setMetaName("twitter:description", ogDescription || description);
    setMetaName("twitter:image", ogImage);
    setMetaName("twitter:card", "summary_large_image");

    // Restore default on unmount
    return () => {
      document.title = `${SITE_NAME} — Analyse dermatologique IA, Glow Score & routine skincare personnalisée`;
    };
  }, [title, description, canonical, ogTitle, ogDescription, ogImage, ogType, noIndex]);
}
