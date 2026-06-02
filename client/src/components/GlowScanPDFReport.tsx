/**
 * GlowScanPDFReport — Document react-pdf/renderer
 * Rapport de pré-analyse cutanée exportable
 */
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { AnalysisResult } from "@shared/schema";
import type { Product } from "@shared/catalog";

// Polices built-in react-pdf (pas besoin d'enregistrement)
// Helvetica = Arial équivalent PDF

const C = {
  dark: "#0d0a0e",
  violet: "#7c3aed",
  violetLight: "#a78bfa",
  pink: "#E91E8C",
  white: "#FFFFFF",
  offWhite: "#f8f7ff",
  textPrimary: "#f3f0ff",
  textMuted: "rgba(200,185,255,0.65)",
  gray100: "#f3f4f6",
  gray300: "#d1d5db",
  gray500: "#6b7280",
  gray700: "#374151",
  green: "#10b981",
  amber: "#f59e0b",
  red: "#E91E8C",
  borderLight: "#e8e3ff",
};

const S = StyleSheet.create({
  page: {
    backgroundColor: C.white,
    fontFamily: "Helvetica",
    paddingBottom: 90,
  },

  // ── Filigrane ─────────────────────────────────────────────────────
  watermark: {
    position: "absolute",
    top: "42%",
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 96,
    fontFamily: "Helvetica-Bold",
    color: C.violet,
    opacity: 0.04,
  },

  // ── Header ────────────────────────────────────────────────────────
  header: {
    backgroundColor: C.dark,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBrand: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: C.violet,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: C.textPrimary,
    marginBottom: 3,
  },
  headerSubtitle: {
    fontSize: 8,
    color: C.textMuted,
    marginBottom: 10,
    lineHeight: 1.4,
  },
  headerMetaRow: {
    flexDirection: "row",
    gap: 16,
  },
  headerMeta: {
    fontSize: 8,
    color: "rgba(255,255,255,0.4)",
  },
  headerMetaBold: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "rgba(167,139,250,0.7)",
  },

  // ── Section wrapper ────────────────────────────────────────────────
  section: {
    marginHorizontal: 20,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: C.violet,
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },

  // ── Profil ────────────────────────────────────────────────────────
  profileCard: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: C.offWhite,
    borderWidth: 1,
    borderColor: C.borderLight,
    flexDirection: "row",
    gap: 16,
  },
  profilePhoto: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: C.violet,
    objectFit: "cover",
  },
  profilePhotoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: C.violet,
    backgroundColor: "#f3e8ff",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    flex: 1,
    justifyContent: "center",
  },
  profileName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: C.dark,
    marginBottom: 2,
  },
  profileCondition: {
    fontSize: 9,
    color: C.gray500,
    marginBottom: 8,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginBottom: 2,
  },
  scoreValue: {
    fontSize: 32,
    fontFamily: "Helvetica-Bold",
    color: C.violet,
    lineHeight: 1,
  },
  scoreLabel: {
    fontSize: 10,
    color: C.gray500,
  },
  progressTrack: {
    height: 6,
    backgroundColor: C.gray300,
    borderRadius: 3,
    marginTop: 6,
    marginBottom: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: C.pink,
  },
  skinTypeText: {
    fontSize: 9,
    color: C.gray700,
    marginTop: 4,
  },

  // ── Zones ─────────────────────────────────────────────────────────
  zonesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  zoneCard: {
    width: "22.5%",
    padding: 8,
    borderRadius: 8,
    backgroundColor: C.white,
    borderWidth: 1,
  },
  zoneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 5,
  },
  zoneName: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.gray700,
    marginBottom: 2,
  },
  zoneSeverity: {
    fontSize: 7,
    color: C.gray500,
    lineHeight: 1.3,
  },

  // ── Évaluation clinique ──────────────────────────────────────────
  detailsBox: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: C.gray100,
    borderWidth: 1,
    borderColor: C.gray300,
  },
  detailsText: {
    fontSize: 9,
    color: C.gray700,
    lineHeight: 1.6,
  },

  // ── Produit recommandé ────────────────────────────────────────────
  productCard: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#fdf2f8",
    borderWidth: 1,
    borderColor: "#fbcfe8",
    gap: 14,
    alignItems: "flex-start",
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fbcfe8",
    objectFit: "cover",
  },
  productImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd6fe",
    backgroundColor: "#f3e8ff",
    alignItems: "center",
    justifyContent: "center",
  },
  productPlaceholderText: {
    fontSize: 28,
  },
  productInfo: {
    flex: 1,
  },
  productBadge: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.green,
    backgroundColor: "rgba(16,185,129,0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 5,
    alignSelf: "flex-start",
  },
  productBenefit: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: C.dark,
    marginBottom: 4,
    lineHeight: 1.3,
  },
  productPrice: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: C.pink,
    marginBottom: 6,
  },
  productUsageItem: {
    fontSize: 8,
    color: C.gray700,
    lineHeight: 1.4,
    marginBottom: 2,
  },
  productWa: {
    marginTop: 8,
    padding: "4px 10px",
    backgroundColor: "#25D366",
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  productWaText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.white,
  },

  // ── Protocole ─────────────────────────────────────────────────────
  protocolBlock: {
    marginBottom: 12,
  },
  protocolHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  protocolHeaderText: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  protocolStep: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 5,
    alignItems: "flex-start",
  },
  stepBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.violet,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  stepBadgeText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.white,
  },
  stepContent: {
    flex: 1,
  },
  stepName: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.gray700,
    lineHeight: 1.3,
  },
  stepProduct: {
    fontSize: 8,
    color: C.violetLight,
    lineHeight: 1.3,
    marginTop: 1,
  },
  stepWhy: {
    fontSize: 8,
    color: C.gray500,
    fontStyle: "italic",
    lineHeight: 1.3,
    marginTop: 1,
  },

  // ── Footer ────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.dark,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  footerQR: {
    width: 56,
    height: 56,
    borderRadius: 6,
    backgroundColor: C.white,
    padding: 3,
  },
  footerMiddle: {
    flex: 1,
  },
  footerDisclaimer: {
    fontSize: 7,
    color: C.textMuted,
    lineHeight: 1.5,
    marginBottom: 3,
  },
  footerCta: {
    fontSize: 7,
    color: "rgba(200,185,255,0.5)",
    marginBottom: 3,
  },
  footerUrl: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.violet,
  },
  footerBrand: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: C.violet,
  },
  footerPageNum: {
    fontSize: 7,
    color: "rgba(255,255,255,0.3)",
    marginTop: 2,
    textAlign: "right",
  },
});

// ── Helpers ──────────────────────────────────────────────────────────

function zoneColor(status: string) {
  if (status === "red") return { dot: C.pink, border: "#fecdd3", bg: "#fff1f2" };
  if (status === "yellow") return { dot: C.amber, border: "#fef3c7", bg: "#fffbeb" };
  return { dot: C.green, border: "#d1fae5", bg: "#f0fdf4" };
}

function normalizeStep(s: any, i: number) {
  if (typeof s === "object" && s !== null) {
    return {
      step: typeof s.step === "string" ? s.step : `Étape ${i + 1}`,
      product: typeof s.product === "string" ? s.product : undefined,
      why: typeof s.why === "string" ? s.why : undefined,
    };
  }
  return { step: typeof s === "string" ? s : `Étape ${i + 1}` };
}

// ── Composant principal ───────────────────────────────────────────────

export interface GlowScanPDFProps {
  result: AnalysisResult;
  imageUrl?: string | null;
  userName?: string | null;
  area?: string;
  qrCode: string;
  bestProduct?: typeof import("@shared/catalog").catalog[0] | null;
  benefit?: string;
  reportNumber: string;
}

export function GlowScanPDFDocument({
  result,
  imageUrl,
  userName,
  area,
  qrCode,
  bestProduct,
  benefit,
  reportNumber,
}: GlowScanPDFProps) {
  const date = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const zones = result.zones || [];
  const morning: any[] = (result as any).protocol?.morning || [];
  const evening: any[] = (result as any).protocol?.evening || [];
  const score = Math.max(0, Math.min(100, result.score || 0));
  const progressWidth = `${score}%` as any;

  return (
    <Document
      title={`GlowScan — Rapport ${reportNumber}`}
      author="GlowScan IA"
      subject="Rapport de pré-analyse cutanée"
      creator="GlowScan — glow-scan.com"
    >
      <Page size="A4" style={S.page}>
        {/* Filigrane */}
        <Text style={S.watermark} fixed>GlowScan</Text>

        {/* ── Header ── */}
        <View style={S.header}>
          <View style={{ flex: 1 }}>
            <Text style={S.headerBrand}>GlowScan</Text>
            <Text style={S.headerTitle}>Rapport de Pré-Analyse Cutanée</Text>
            <Text style={S.headerSubtitle}>
              Généré par un outil de pré-analyse cutanée IA — Spécialisé Peaux Africaines
            </Text>
            <View style={S.headerMetaRow}>
              <Text style={S.headerMeta}>Date : </Text>
              <Text style={S.headerMetaBold}>{date}</Text>
              <Text style={S.headerMeta}>  |  Réf : </Text>
              <Text style={S.headerMetaBold}>{reportNumber}</Text>
            </View>
          </View>
        </View>

        {/* ── Profil utilisatrice ── */}
        <View style={S.profileCard}>
          {imageUrl ? (
            <Image src={imageUrl} style={S.profilePhoto} />
          ) : (
            <View style={S.profilePhotoPlaceholder}>
              <Text style={{ fontSize: 32 }}>👤</Text>
            </View>
          )}
          <View style={S.profileInfo}>
            <Text style={S.profileName}>{userName || "Utilisatrice GlowScan"}</Text>
            <Text style={S.profileCondition}>{result.condition}</Text>
            <View style={S.scoreRow}>
              <Text style={S.scoreValue}>{score}</Text>
              <Text style={S.scoreLabel}>/100  Glow Score</Text>
            </View>
            <View style={S.progressTrack}>
              <View style={[S.progressFill, { width: progressWidth }]} />
            </View>
            <Text style={S.skinTypeText}>
              Type de peau : {result.skinType || "Non déterminé"}
              {result.severity ? `  |  Sévérité : ${result.severity}` : ""}
            </Text>
          </View>
        </View>

        {/* ── Diagnostic zone par zone ── */}
        {zones.length > 0 && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>DIAGNOSTIC ZONE PAR ZONE</Text>
            <View style={S.zonesGrid}>
              {zones.slice(0, 8).map((zone: any, i: number) => {
                const colors = zoneColor(zone.status || "green");
                return (
                  <View
                    key={i}
                    style={[S.zoneCard, { borderColor: colors.border, backgroundColor: colors.bg }]}
                  >
                    <View style={[S.zoneDot, { backgroundColor: colors.dot }]} />
                    <Text style={S.zoneName}>{zone.name}</Text>
                    <Text style={S.zoneSeverity}>
                      {zone.status === "red" ? "Attention requise" : zone.status === "yellow" ? "A surveiller" : "Zone saine"}
                    </Text>
                    {zone.note && (
                      <Text style={[S.zoneSeverity, { marginTop: 2, fontStyle: "italic" }]}>
                        {zone.note.slice(0, 60)}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Évaluation clinique ── */}
        {result.details && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>EVALUATION CLINIQUE</Text>
            <View style={S.detailsBox}>
              <Text style={S.detailsText}>{result.details}</Text>
            </View>
          </View>
        )}

        {/* ── Produit recommandé ── */}
        {bestProduct && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>SOIN RECOMMANDE</Text>
            <View style={S.productCard}>
              <View style={S.productImagePlaceholder}>
                <Text style={S.productPlaceholderText}>✦</Text>
              </View>
              <View style={S.productInfo}>
                <Text style={S.productBadge}>Valide pour peaux africaines</Text>
                <Text style={S.productBenefit}>{benefit || "Soin personnalise"}</Text>
                <Text style={S.productPrice}>
                  {bestProduct.price?.toLocaleString("fr-FR")} FCFA
                </Text>
                {(bestProduct.usagePoints || []).slice(0, 3).map((point: string, i: number) => (
                  <Text key={i} style={S.productUsageItem}>• {point}</Text>
                ))}
                <View style={S.productWa}>
                  <Text style={S.productWaText}>Commander via WhatsApp</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ── Protocole matin / soir ── */}
        {(morning.length > 0 || evening.length > 0) && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>PROTOCOLE PERSONNALISE</Text>

            {morning.length > 0 && (
              <View style={S.protocolBlock}>
                <View style={[S.protocolHeader, { backgroundColor: "rgba(245,158,11,0.08)" }]}>
                  <Text style={[S.protocolHeaderText, { color: C.amber }]}>
                    Rituel du Matin — protection & regulation
                  </Text>
                </View>
                {morning.map((s: any, i: number) => {
                  const step = normalizeStep(s, i);
                  return (
                    <View key={i} style={S.protocolStep}>
                      <View style={S.stepBadge}>
                        <Text style={S.stepBadgeText}>{i + 1}</Text>
                      </View>
                      <View style={S.stepContent}>
                        <Text style={S.stepName}>{step.step}</Text>
                        {step.product && <Text style={S.stepProduct}>{step.product}</Text>}
                        {step.why && <Text style={S.stepWhy}>{step.why}</Text>}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {evening.length > 0 && (
              <View style={S.protocolBlock}>
                <View style={[S.protocolHeader, { backgroundColor: "rgba(124,58,237,0.06)" }]}>
                  <Text style={[S.protocolHeaderText, { color: C.violet }]}>
                    Rituel du Soir — reparation intense
                  </Text>
                </View>
                {evening.map((s: any, i: number) => {
                  const step = normalizeStep(s, i);
                  return (
                    <View key={i} style={S.protocolStep}>
                      <View style={[S.stepBadge, { backgroundColor: C.violetLight }]}>
                        <Text style={S.stepBadgeText}>{i + 1}</Text>
                      </View>
                      <View style={S.stepContent}>
                        <Text style={S.stepName}>{step.step}</Text>
                        {step.product && <Text style={S.stepProduct}>{step.product}</Text>}
                        {step.why && <Text style={S.stepWhy}>{step.why}</Text>}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ── Footer (fixe sur chaque page) ── */}
        <View style={S.footer} fixed>
          {qrCode && <Image src={qrCode} style={S.footerQR} />}
          <View style={S.footerMiddle}>
            <Text style={S.footerDisclaimer}>
              Ce rapport est un outil de pre-analyse cutanee genere par IA — il ne remplace pas une
              consultation medicale. Consultez un dermatologue pour tout probleme persistant.
            </Text>
            <Text style={S.footerCta}>
              Refaites votre analyse ou partagez avec vos proches
            </Text>
            <Text style={S.footerUrl}>glow-scan.com</Text>
          </View>
          <View>
            <Text style={S.footerBrand}>GlowScan</Text>
            <Text
              style={S.footerPageNum}
              render={({ pageNumber, totalPages }) =>
                `${pageNumber} / ${totalPages}`
              }
            />
          </View>
        </View>
      </Page>
    </Document>
  );
}
