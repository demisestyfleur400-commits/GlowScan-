import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal, varchar, smallint, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Import Auth and Chat models
export * from "./models/auth";
export * from "./models/chat";

import { users } from "./models/auth";

// === TABLE DEFINITIONS ===

// Scans table for dermatological analysis
export const scans = pgTable("scans", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id), // Optional: allow anonymous scans or link to auth user
  sessionId: text("session_id"), // Set for anonymous scans — used to backfill userId on signup/login
  imageUrl: text("image_url").notNull(),
  area: text("area").notNull(), // 'face', 'body', 'hair'
  condition: text("condition"), // Detected condition e.g. 'Acne', 'Dry Skin'
  analysis: text("analysis"), // Detailed analysis text
  recommendations: jsonb("recommendations"), // JSON array of recommended products/tips
  score: integer("score").default(0), // Glow score 0-100
  motivation: text("motivation"), // Motivational message
  createdAt: timestamp("created_at").defaultNow(),
  // === RLHF / Expert review pipeline ===
  isVerified: boolean("is_verified").default(false).notNull(),
  expertNote: text("expert_note"),
  expertCorrectedCondition: text("expert_corrected_condition"),
  expertReviewedAt: timestamp("expert_reviewed_at"),
  expertReviewer: text("expert_reviewer"),
  // === GlowScan DERM — patient & contexte clinique ===
  patientId: integer("patient_id"),                  // FK -> patients.id (nullable, set quand scan d'un patient Pro)
  clinicalContext: jsonb("clinical_context"),         // questionnaire dermato (réponses pré-remplies par IA + corrigées)
  dermatoNote: text("dermato_note"),                  // note libre du dermato sur ce scan
});

// === RELATIONS ===
export const scansRelations = relations(scans, ({ one }) => ({
  user: one(users, {
    fields: [scans.userId],
    references: [users.id],
  }),
}));

// === BASE SCHEMAS ===
export const insertScanSchema = createInsertSchema(scans).omit({ id: true, createdAt: true });

// === EXPLICIT API CONTRACT TYPES ===
export type Scan = typeof scans.$inferSelect;
export type InsertScan = z.infer<typeof insertScanSchema>;

export type CreateScanRequest = InsertScan;
export type ScanResponse = Scan;

// Analytics: Page visits tracking
export const pageVisits = pgTable("page_visits", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id"),
  page: text("page").notNull(),
  country: text("country"),
  city: text("city"),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Analytics: WhatsApp clicks tracking
export const whatsappClicks = pgTable("whatsapp_clicks", {
  id: serial("id").primaryKey(),
  productId: text("product_id").notNull(),
  productName: text("product_name").notNull(),
  brand: text("brand").notNull(),
  whatsappNumber: text("whatsapp_number").notNull(),
  country: text("country"),
  city: text("city"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPageVisitSchema = createInsertSchema(pageVisits).omit({ id: true, createdAt: true });
export const insertWhatsappClickSchema = createInsertSchema(whatsappClicks).omit({ id: true, createdAt: true });

export type PageVisit = typeof pageVisits.$inferSelect;
export type InsertPageVisit = z.infer<typeof insertPageVisitSchema>;
export type WhatsappClick = typeof whatsappClicks.$inferSelect;
export type InsertWhatsappClick = z.infer<typeof insertWhatsappClickSchema>;

// Orders table for tracking shop purchases
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull(),
  userId: text("user_id").references(() => users.id),
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone").notNull(),
  clientAddress: text("client_address").notNull(),
  clientNotes: text("client_notes"),
  items: jsonb("items").notNull(),
  totalPrice: integer("total_price").notNull(),
  brand: text("brand").notNull(),
  whatsappNumber: text("whatsapp_number").notNull(),
  status: text("status").notNull().default("received"), // received | paid_verified | shipping | delivered (0015)
  createdAt: timestamp("created_at").defaultNow(),
  // Refonte Organic (0015) : total figé par le serveur, livraison, paiement.
  subtotal: integer("subtotal"),
  deliveryCity: text("delivery_city"),
  deliveryFee: integer("delivery_fee"),
  quartier: text("quartier"),
  payMethod: varchar("pay_method", { length: 10 }), // orange | mtn | cash
  proofUrl: text("proof_url"),
});

export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

// Loyalty points tracking
export const loyaltyPoints = pgTable("loyalty_points", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  points: integer("points").notNull(),
  reason: text("reason").notNull(),
  referenceId: text("reference_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Loyalty rewards redeemed
export const loyaltyRewards = pgTable("loyalty_rewards", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  rewardType: text("reward_type").notNull(),
  pointsSpent: integer("points_spent").notNull(),
  discountCode: text("discount_code").notNull(),
  discountPercent: integer("discount_percent").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLoyaltyPointSchema = createInsertSchema(loyaltyPoints).omit({ id: true, createdAt: true });
export const insertLoyaltyRewardSchema = createInsertSchema(loyaltyRewards).omit({ id: true, createdAt: true });
export type LoyaltyPoint = typeof loyaltyPoints.$inferSelect;
export type InsertLoyaltyPoint = z.infer<typeof insertLoyaltyPointSchema>;
export type LoyaltyReward = typeof loyaltyRewards.$inferSelect;
export type InsertLoyaltyReward = z.infer<typeof insertLoyaltyRewardSchema>;

// Push notification subscriptions
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  morningReminder: boolean("morning_reminder").default(true),
  eveningReminder: boolean("evening_reminder").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({ id: true, createdAt: true });
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;

// Challenges table — défi entre amis
export const challenges = pgTable("challenges", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  challengerUserId: text("challenger_user_id").references(() => users.id),
  challengerName: text("challenger_name"),
  scanId: integer("scan_id").references(() => scans.id),
  score: integer("score").notNull(),
  condition: text("condition"),
  area: text("area"),
  acceptedCount: integer("accepted_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChallengeSchema = createInsertSchema(challenges).omit({ id: true, createdAt: true });
export type Challenge = typeof challenges.$inferSelect;
export type InsertChallenge = z.infer<typeof insertChallengeSchema>;

// Abonnements Premium
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  status: text("status").notNull().default("active"), // active | expired | cancelled
  plan: text("plan").notNull().default("monthly"),
  startedAt: timestamp("started_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  activatedBy: text("activated_by"), // admin qui a activé
  note: text("note"), // ex: "paiement WhatsApp reçu le 20/03"
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true, startedAt: true });
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

// Demandes d'abonnement Premium — paiement Mobile Money
export const premiumRequests = pgTable("premium_requests", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  reference: text("reference").notNull().unique(), // ex: "GS-A1B2C3"
  method: text("method").notNull(), // "mtn_momo" | "orange_money"
  phone: text("phone").notNull(),
  amount: integer("amount").notNull().default(1000),
  status: text("status").notNull().default("pending"), // pending | confirmed | rejected
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  processedBy: text("processed_by"),
  note: text("note"),
});

export const insertPremiumRequestSchema = createInsertSchema(premiumRequests).omit({ id: true, createdAt: true });
export type PremiumRequest = typeof premiumRequests.$inferSelect;
export type InsertPremiumRequest = z.infer<typeof insertPremiumRequestSchema>;

// Referrals tracking — parrainage automatique
export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: text("referrer_id").notNull().references(() => users.id),
  referredId: text("referred_id").notNull().references(() => users.id),
  rewardedAt: timestamp("rewarded_at").defaultNow(),
});

export const insertReferralSchema = createInsertSchema(referrals).omit({ id: true, rewardedAt: true });
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;

// Table leads — suivi des commandes WhatsApp avec code de référence
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  referenceCode: text("reference_code").notNull().unique(),
  userId: text("user_id").references(() => users.id),
  brandPhone: text("brand_phone").notNull(),
  brandName: text("brand_name").notNull(),
  productNames: text("product_names").notNull(),
  totalPrice: integer("total_price").default(0),
  status: text("status").notNull().default("clicked"), // clicked | confirmed | ordered
  confirmedByBusiness: boolean("confirmed_by_business").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true });
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;

// Table bien-être quotidien — tracker eau, sommeil, humeur
export const wellnessLogs = pgTable("wellness_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  date: text("date").notNull(), // YYYY-MM-DD
  waterGlasses: integer("water_glasses").default(0), // 0-8
  sleepHours: integer("sleep_hours").default(0), // 0-12
  mood: integer("mood").default(0), // 1-5 (1=très mal, 5=excellent)
  energy: integer("energy").default(0), // 1-5
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWellnessLogSchema = createInsertSchema(wellnessLogs).omit({ id: true, createdAt: true, updatedAt: true });
export type WellnessLog = typeof wellnessLogs.$inferSelect;
export type InsertWellnessLog = z.infer<typeof insertWellnessLogSchema>;

// Partenaires locaux — parfumeries, boutiques beauté
export const partners = pgTable("partners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(), // ex: "Akwa, Douala"
  whatsapp: text("whatsapp").notNull(), // ex: "237677000000"
  description: text("description"),
  category: text("category").notNull().default("parfumerie"), // parfumerie | boutique | pharmacie
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const partnerProducts = pgTable("partner_products", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").notNull().references(() => partners.id),
  name: text("name").notNull(),
  category: text("category").notNull().default("soin"), // soin | parfum | cheveux | maquillage | corps
  description: text("description"),
  price: integer("price").notNull().default(0), // en FCFA
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPartnerSchema = createInsertSchema(partners).omit({ id: true, createdAt: true });
export const insertPartnerProductSchema = createInsertSchema(partnerProducts).omit({ id: true, createdAt: true });

// Routines (matin / soir) — chaque user a 0 à 2 routines
export const routines = pgTable("routines", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  period: text("period").notNull(), // "morning" | "evening"
  reminderTime: text("reminder_time"), // "HH:MM" ou null = pas de rappel
  reminderEnabled: boolean("reminder_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const routineSteps = pgTable("routine_steps", {
  id: serial("id").primaryKey(),
  routineId: integer("routine_id").notNull().references(() => routines.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // "product" | "care"
  label: text("label").notNull(),
  productId: text("product_id"), // ref produit catalog (optional, juste pour affichage)
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const routineCompletions = pgTable("routine_completions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  stepId: integer("step_id").notNull().references(() => routineSteps.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRoutineSchema = createInsertSchema(routines).omit({ id: true, createdAt: true });
export const insertRoutineStepSchema = createInsertSchema(routineSteps).omit({ id: true, createdAt: true });
export const insertRoutineCompletionSchema = createInsertSchema(routineCompletions).omit({ id: true, createdAt: true });

// Produits mis en avant sur la home (gérés depuis l'admin)
export const featuredProducts = pgTable("featured_products", {
  id: serial("id").primaryKey(),
  productId: text("product_id").notNull(),
  position: integer("position").notNull().default(0),
  badge: text("badge"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Cache des conseils IA personnalisés (1 entrée par user)
export const personalizedTipsCache = pgTable("personalized_tips_cache", {
  userId: text("user_id").primaryKey().references(() => users.id),
  scanId: integer("scan_id"),
  tips: jsonb("tips").$type<string[]>().notNull(),
  generatedAt: timestamp("generated_at").defaultNow(),
});

export const insertFeaturedProductSchema = createInsertSchema(featuredProducts).omit({ id: true, createdAt: true });
export type FeaturedProduct = typeof featuredProducts.$inferSelect;
export type InsertFeaturedProduct = z.infer<typeof insertFeaturedProductSchema>;
export type PersonalizedTipsCache = typeof personalizedTipsCache.$inferSelect;
export type Routine = typeof routines.$inferSelect;
export type RoutineStep = typeof routineSteps.$inferSelect;
export type RoutineCompletion = typeof routineCompletions.$inferSelect;
export type InsertRoutine = z.infer<typeof insertRoutineSchema>;
export type InsertRoutineStep = z.infer<typeof insertRoutineStepSchema>;
export type InsertRoutineCompletion = z.infer<typeof insertRoutineCompletionSchema>;
export type Partner = typeof partners.$inferSelect;
export type InsertPartner = z.infer<typeof insertPartnerSchema>;
export type PartnerProduct = typeof partnerProducts.$inferSelect;
export type InsertPartnerProduct = z.infer<typeof insertPartnerProductSchema>;

// ═══════════════════════════════════════════════════════════════════════
// GLOWSCAN PRO — B2B SaaS pour dermatologues indépendants
// ═══════════════════════════════════════════════════════════════════════

// Compte dermatologue Pro (1 user = 0 ou 1 compte Pro)
export const proAccounts = pgTable("pro_accounts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id).unique(),
  fullName: text("full_name").notNull(),               // Dr. Nom Prénom — utilisé dans WhatsApp + PDF
  cabinetName: text("cabinet_name"),                   // Nom du cabinet (optionnel)
  phone: text("phone"),                                 // WhatsApp dermato (pour signature)
  city: text("city"),
  licenseNumber: text("license_number"),                // N° d'ordre professionnel (ONMC) — vérif manuelle
  trialEndsAt: timestamp("trial_ends_at").notNull(),    // 14 jours après inscription
  subscriptionStatus: text("subscription_status").notNull().default("trial"), // trial | active | expired
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  onboardingDone: boolean("onboarding_done").default(false),
  consentSignedAt: timestamp("consent_signed_at").notNull(),
  profile: varchar("profile", { length: 10 }).notNull().default("derm"), // derm | relay | ngo (migration 0019)
  relayLevel: smallint("relay_level").notNull().default(0),
  peerAvailable: boolean("peer_available").notNull().default(true),     // disponible pour les avis confrères (migration 0024)
  country: varchar("country", { length: 40 }),            // 3 = Formateur (promu par le référent), migration 0022
  // Mentions obligatoires de l'ordonnance (ONMC), migration 0025
  cabinetAddress: text("cabinet_address"),
  cabinetPhone: text("cabinet_phone"),
  specialtyTitle: text("specialty_title"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Patients d'un dermatologue
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  dermatologistId: integer("dermatologist_id").notNull().references(() => proAccounts.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  age: integer("age"),
  sex: text("sex"),                                     // F | M | autre
  whatsappNumber: text("whatsapp_number"),              // ex: "237677000000"
  photoUrl: text("photo_url"),                          // photo profil
  status: text("status").default("green"),              // red | yellow | green (calculé auto par IA)
  intakePending: boolean("intake_pending").default(true), // true = en attente d'analyse, false = analysé
  lastScanAt: timestamp("last_scan_at"),
  lastOpenedAt: timestamp("last_opened_at"),            // dernière ouverture du dossier par le dermatologue (reprise auto)
  createdAt: timestamp("created_at").defaultNow(),
});

// Secrétaires d'un dermatologue (rôle distinct avec permissions limitées)
export const secretaryAccounts = pgTable("secretary_accounts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id).unique(),
  proAccountId: integer("pro_account_id").notNull().references(() => proAccounts.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: text("created_by").notNull(), // userId of the dermatologist who created this secretary account
});

export const insertProAccountSchema = createInsertSchema(proAccounts).omit({ id: true, createdAt: true });
export const insertPatientSchema = createInsertSchema(patients).omit({ id: true, createdAt: true, lastScanAt: true, status: true });
export const insertSecretaryAccountSchema = createInsertSchema(secretaryAccounts).omit({ id: true, createdAt: true });
export type ProAccount = typeof proAccounts.$inferSelect;
export type InsertProAccount = z.infer<typeof insertProAccountSchema>;
export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type SecretaryAccount = typeof secretaryAccounts.$inferSelect;
export type InsertSecretaryAccount = z.infer<typeof insertSecretaryAccountSchema>;

// Custom types for analysis response
export interface PredictiveRisk {
  level: "high" | "medium" | "low";
  risk: string;
  delay: string;
}

// ═══════════════════════════════════════════════════════════════════
// TRAINING DATA — Dataset peaux africaines (actif stratégique GlowScan)
// Alimenté automatiquement après chaque analyse Pro + override
// 22 labels cliniques — Fitzpatrick IV-VI
// ═══════════════════════════════════════════════════════════════════
export const trainingData = pgTable("training_data", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  scanId: integer("scan_id").references(() => scans.id),

  // ── Source & mode ───────────────────────────────────────────────
  mode: varchar("mode", { length: 10 }),                        // 'B2C' | 'B2B'
  source: varchar("source", { length: 30 }),                    // 'user_upload' | 'dermatologist_review' | 'clinical_partner'
  promptVersion: varchar("prompt_version", { length: 30 }),     // ex: 'b2c-v3' | 'b2b-v2'

  // ── Empreinte image (jamais la photo en clair) ──────────────────
  imageHash: varchar("image_hash", { length: 64 }),
  imageEncrypted: text("image_encrypted"),

  // ── Label 1 — Qualité image ─────────────────────────────────────
  imageQuality: varchar("image_quality", { length: 20 }),       // 'insufficient' | 'acceptable' | 'good'
  imageArtifacts: jsonb("image_artifacts"),                     // ImageArtifact[]

  // ── Label 2 — Phototype / peau ──────────────────────────────────
  skinPhototype: varchar("skin_phototype", { length: 10 }),     // 'IV' | 'V' | 'VI' | 'unknown'
  skinState: varchar("skin_state", { length: 30 }),             // 'oily' | 'dry' | 'combination' | ...

  // ── Label 3 — Zone anatomique ───────────────────────────────────
  bodyArea: varchar("body_area", { length: 30 }),               // 'face' | 'zone_t' | 'forehead' | ...

  // ── Patient ─────────────────────────────────────────────────────
  patientSex: varchar("patient_sex", { length: 10 }),           // 'female' | 'male' | 'other' | 'unknown'
  ageRange: varchar("age_range", { length: 20 }),               // ex: '21-30'
  country: varchar("country", { length: 50 }),

  // ── Labels 4-6 — Lésions & conditions ──────────────────────────
  lesionTypes: jsonb("lesion_types"),                           // LesionType[]
  // TEXT (et non varchar) : les libellés de condition sont des phrases longues
  // (ex "Acné Rétentionnelle et Inflammatoire Légère (…)") qui dépassaient 60.
  primaryCondition: text("primary_condition"),
  secondaryCondition: text("secondary_condition"),

  // ── Labels 7-9 — Niveaux cliniques ──────────────────────────────
  inflammationLevel: varchar("inflammation_level", { length: 15 }), // 'none'|'low'|'moderate'|'high'
  severity: varchar("severity", { length: 15 }),                // 'mild'|'moderate'|'severe'|'critical'
  confidence: varchar("confidence", { length: 10 }),            // 'low'|'medium'|'high'

  // ── Label 10 — Pièges visuels ────────────────────────────────────
  visualPitfalls: jsonb("visual_pitfalls"),                     // VisualPitfall[]

  // ── Labels 11-14 — État cutané ───────────────────────────────────
  skinBarrierStatus: varchar("skin_barrier_status", { length: 25 }), // 'intact'|'mildly_compromised'|'compromised'
  sebumLevel: varchar("sebum_level", { length: 15 }),           // 'low'|'moderate'|'high'
  drynessLevel: varchar("dryness_level", { length: 15 }),       // 'low'|'moderate'|'high'
  pigmentationLevel: varchar("pigmentation_level", { length: 15 }), // 'none'|'mild'|'moderate'|'high'

  // ── Signes visibles libres (GlowScanBase) ────────────────────────
  visibleSigns: jsonb("visible_signs"),                         // string[] — observations libres

  // ── Balance métriques (B2C GlowScore) ───────────────────────────
  balance: jsonb("balance"),                                    // BalanceMetrics { hydration, sebum, sensitivity, uniformity, elasticity, radiance }

  // ── Alertes cliniques ────────────────────────────────────────────
  redFlags: jsonb("red_flags"),                                 // string[]

  // ── Champs B2C (GlowScanB2C) ─────────────────────────────────────
  details: text("details"),                                     // résumé court visible — B2C
  motivation: text("motivation"),                               // phrase encourageante — B2C
  zonesB2C: jsonb("zones_b2c"),                                 // ZoneAnalysisB2C[]
  recommendations: jsonb("recommendations"),                    // B2CRecommendation[]
  morningProtocol: jsonb("morning_protocol"),                   // B2CProduct[]
  eveningProtocol: jsonb("evening_protocol"),                   // B2CProduct[]
  weeklyProtocol: text("weekly_protocol"),                      // soin hebdomadaire
  whenToSeeDermatologist: text("when_to_see_dermatologist"),    // seuil de consultation
  b2cOutput: jsonb("b2c_output"),                               // sortie B2C complète archivée

  // ── Label 15 — Facteurs visibles ─────────────────────────────────
  visibleFactors: jsonb("visible_factors"),                     // VisibleFactor[]

  // ── Label 16 — Diagnostics différentiels ─────────────────────────
  differentialDiagnosis: jsonb("differential_diagnosis"),       // DifferentialDiagnosis[]

  // ── Label 17 — Classes de recommandations ────────────────────────
  recommendationClasses: jsonb("recommendation_classes"),       // RecommendationClass[]

  // ── Diagnostic IA brut ───────────────────────────────────────────
  aiDiagnosis: jsonb("ai_diagnosis"),                           // JSON brut retourné par le modèle
  aiModelVersion: varchar("ai_model_version", { length: 50 }),
  aiConfidence: decimal("ai_confidence", { precision: 3, scale: 2 }),

  // ── Champs B2B (GlowScanB2B) ────────────────────────────────────
  score: integer("score"),                                      // GlowScore 0-100
  clinicalSummary: text("clinical_summary"),                    // 4-5 phrases cliniques
  zonesAnalysis: jsonb("zones_analysis"),                       // ZoneAnalysisItem[]
  antecedentsIntegration: text("antecedents_integration"),      // lien antécédents → diagnostic
  toxicIngredients: jsonb("toxic_ingredients"),                  // ToxicIngredient[]
  clinicalProtocol: jsonb("clinical_protocol"),                  // ClinicalProtocol complet
  logistics: text("logistics"),                                  // null si Douala/Yaoundé
  prognostic: text("prognostic"),                               // évolution semaine par semaine
  contraindications: jsonb("contraindications"),                 // string[]
  b2bOutput: jsonb("b2b_output"),                               // sortie B2B complète archivée

  // ── Vérité terrain ───────────────────────────────────────────────
  groundTruth: jsonb("ground_truth"),                           // GlowScanAnnotation validée (null = pas encore validée)
  annotation: jsonb("annotation"),                              // GlowScanAnnotation complète structurée
  clinicalAnnotation: jsonb("clinical_annotation"),             // ClinicalAnnotation (B2B)

  // ── Label 18 — Validation dermatologue ──────────────────────────
  dermValidationStatus: varchar("derm_validation_status", { length: 20 }).default("pending"),
  // 'pending'|'validated'|'corrected'|'rejected'|'needs_review'
  dermatologistLabel: jsonb("dermatologist_label"),             // DermatologistLabel
  validatedBy: varchar("validated_by", { length: 100 }),       // 'ai_only' | 'doctor_[id]'
  validatedAt: timestamp("validated_at"),
  overrideReason: text("override_reason"),

  // ── Pipeline & statut final ──────────────────────────────────────
  finalStatus: varchar("final_status", { length: 20 }).default("pending"),
  // 'pending'|'validated'|'rejected'|'needs_review'

  // ── Poids d'entraînement (label 22) ─────────────────────────────
  // 0=rejeté 1=auto 2=validé dermato 3=corrigé dermato
  trainingWeight: integer("training_weight").default(1),

  // ── Sécurité & export ────────────────────────────────────────────
  isAnonymized: boolean("is_anonymized").default(true),
  exportedToDataset: boolean("exported_to_dataset").default(false),
  exportedAt: timestamp("exported_at"),
  gdprConsent: boolean("gdpr_consent").default(true),

  createdAt: timestamp("created_at").defaultNow(),
});

export type TrainingData = typeof trainingData.$inferSelect;
export type TrainingDataInsert = typeof trainingData.$inferInsert;

export interface FaceZone {
  name: string;
  status: "red" | "yellow" | "green";
  issue?: string;
}

export interface ZoneAnalysisItem {
  name: string;
  status: "red" | "yellow" | "green";
  short: string;
  long: string;
}

export interface ProtocolStep {
  step: string;
  product?: string;
  why?: string;
}

export interface AnalysisResult {
  condition: string;
  severity: string;
  // Échelle GEA/IGA de l'acné (0–4) + libellé, ou null si le diagnostic n'est pas
  // une forme d'acné. Mode DERM uniquement (étude de concordance Kappa).
  geaIgaGrade?: number | null;
  geaIgaLabel?: string | null;
  score: number;
  skinType: string;
  details: string;
  motivation: string;
  zones?: FaceZone[];
  stats: {
    lesions: string;
    zones: string;
    pores: string;
    marks: string;
  };
  balance: {
    inflammation: number;
    sebum: number;
    pores: number;
    sensitivity: number;
    scars: number;
  };
  recommendations: {
    products: string[];
    morning: string[];
    evening: string[];
    weekly: string;
  };
  // === Nouveaux champs B2C v3 ===
  conditionSecondaire?: string | null;
  photo_quality?: "insufficient" | "acceptable" | "good";
  confidence?: "low" | "medium" | "high";
  redFlags?: string[];
  whenToSeeDermatologist?: string;
  medicalDisclaimer?: string;
  zonesB2C?: Array<{ zone: string; status: string; findings: string; advice: string }>;
  // === Résultat patient (refonte Organic) — cf. shared/resultB2C.ts ===
  faceZones?: import("./resultB2C").FaceZones | null; // 5 zones fixes, null = non visible
  spots?: number | null;      // taches (hyperpigmentation) 0-100, null = non évaluable
  blemishes?: number | null;  // imperfections actives 0-100, null = non évaluable
  urgent?: boolean;           // seul déclencheur de l'état « urgent »
  urgentSigns?: string[];
  morningProtocol?: Array<{ step: string; product: string; brand?: string; price?: string; why?: string }>;
  eveningProtocol?: Array<{ step: string; product: string; brand?: string; price?: string; why?: string }>;
  weeklyProtocol?: string;
  // === Nouveaux champs rapport médical ===
  metrics?: {
    hydratation: number; // 0-100
    eclat: number;       // 0-100
    purete: number;      // 0-100
  };
  zoneAnalysis?: ZoneAnalysisItem[];
  conclusion?: {
    short: string;
    long: string;
  };
  severityLevel?: 1 | 2 | 3 | 4 | 5;
  severityLabel?: string;
  protocol?: {
    morning: ProtocolStep[];
    evening: ProtocolStep[];
  };
  reference?: string; // ex: GS-2026-0042
  predictiveInsights?: {
    risks: PredictiveRisk[];
    actionWindow: string;
    progression?: {
      previousScore: number;
      delta: number;
      trend: "improving" | "stable" | "worsening";
      weeksTracked: number;
    };
  };
}

// ════════════════════════════════════════════════════════════════════════
// CONSULTATIONS IN-APP (circuit fermé B2C ↔ dermatologue) — chat + paiement
// ════════════════════════════════════════════════════════════════════════
export const consultations = pgTable("consultations", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),          // patient B2C
  proAccountId: integer("pro_account_id").notNull().references(() => proAccounts.id), // dermatologue
  scanId: integer("scan_id").references(() => scans.id),                 // contexte (photo + diagnostic IA)
  // Contexte figé au moment de l'ouverture (évite de dépendre du scan)
  condition: text("condition"),
  imageUrl: text("image_url"),
  // Cycle de vie : en attente de paiement → ouverte → répondue → clôturée
  status: varchar("status", { length: 20 }).default("pending_payment"),  // pending_payment | open | answered | closed
  paymentStatus: varchar("payment_status", { length: 20 }).default("unpaid"), // unpaid | paid
  paymentRef: text("payment_ref"),                                       // réf. Mobile Money / preuve
  priceFcfa: integer("price_fcfa").default(0),
  signedAt: timestamp("signed_at"),                                      // signature du compte rendu (code à 4 chiffres, migration 0020)
  // Compteurs de non-lus par côté (pour les badges d'inbox)
  unreadPatient: integer("unread_patient").default(0),
  unreadDoctor: integer("unread_doctor").default(0),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const consultationMessages = pgTable("consultation_messages", {
  id: serial("id").primaryKey(),
  consultationId: integer("consultation_id").notNull().references(() => consultations.id, { onDelete: "cascade" }),
  senderType: varchar("sender_type", { length: 10 }).notNull(),         // patient | doctor
  senderId: text("sender_id").notNull(),
  body: text("body"),
  imageUrl: text("image_url"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Consultation = typeof consultations.$inferSelect;
export type ConsultationMessage = typeof consultationMessages.$inferSelect;

// ════════════════════════════════════════════════════════════════════════
// Échanges IA cliniques (fil de questions/réponses du médecin) — trace auditable.
// Double clé (cohérent avec `scans` qui porte userId ET patientId) :
//  · patientId      → fil rattaché au patient (persistant à travers ses visites,
//                      contexte /derm/analyse où un `patients` row existe).
//  · consultationId → fil rattaché à un épisode de consultation in-app (contexte
//                      ConsultationChat, où il n'y a pas de `patients` row).
// doctorId = clé d'isolation : un médecin ne lit que ses propres échanges.
// ════════════════════════════════════════════════════════════════════════
export const clinicalAiExchanges = pgTable("clinical_ai_exchanges", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").notNull().references(() => proAccounts.id, { onDelete: "cascade" }),
  patientId: integer("patient_id").references(() => patients.id, { onDelete: "cascade" }),
  consultationId: integer("consultation_id").references(() => consultations.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertClinicalAiExchangeSchema = createInsertSchema(clinicalAiExchanges).omit({ id: true, createdAt: true });
export type ClinicalAiExchange = typeof clinicalAiExchanges.$inferSelect;
export type InsertClinicalAiExchange = z.infer<typeof insertClinicalAiExchangeSchema>;

// ════════════════════════════════════════════════════════════════════════
// CONSENTEMENTS PATIENT (refonte Organic) — migrations/0013_consents.sql
// Une ligne par compte, ou par numéro WhatsApp pour un patient sans compte.
// ════════════════════════════════════════════════════════════════════════
export const consents = pgTable("consents", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  phone: text("phone"),                                   // 2376XXXXXXXX (cf. shared/phone.ts)
  care: boolean("care").notNull().default(true),          // partage avec mes médecins : toujours vrai
  research: boolean("research"),                          // atlas anonymisé
  reminders: boolean("reminders").notNull().default(false), // recontact WhatsApp (relance, suivi)
  stoppedAt: timestamp("stopped_at"),                     // réponse STOP reçue
  followups: boolean("followups").notNull().default(true), // rappels de suivi du médecin (0015)
  followupsStoppedAt: timestamp("followups_stopped_at"),  // « ARRÊT SUIVI » reçu
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export type Consent = typeof consents.$inferSelect;

export const recordAccessLog = pgTable("record_access_log", {
  id: serial("id").primaryKey(),
  patientId: text("patient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  viewerId: text("viewer_id").notNull(),
  viewerRole: varchar("viewer_role", { length: 20 }).notNull(), // derm | secretary | relay | patient
  at: timestamp("at").notNull().defaultNow(),
});

// Scans produit — migrations/0014_product_scans.sql (quota gratuit 3 / semaine).
export const productScans = pgTable("product_scans", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productName: text("product_name"),
  verdict: varchar("verdict", { length: 20 }).notNull(), // compatible | avoid
  flagged: jsonb("flagged").notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ════════════════════════════════════════════════════════════════════════
// Réseau des relais, téléexpertise et formation (migration 0022)
// ════════════════════════════════════════════════════════════════════════
export const programs = pgTable("programs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  funder: text("funder"),
  district: text("district"),
  budgetFcfa: integer("budget_fcfa").notNull().default(0),            // migration 0023
  funderEmail: text("funder_email"),                                   // destinataire du rapport mensuel
  status: varchar("status", { length: 10 }).notNull().default("active"), // active | paused
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const programMembers = pgTable("program_members", {
  programId: integer("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
  relayId: integer("relay_id").notNull().references(() => proAccounts.id, { onDelete: "cascade" }),
  shareProgress: boolean("share_progress").notNull().default(false),  // le relais accepte que le programme voie sa progression
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ pk: primaryKey({ columns: [t.programId, t.relayId] }) }));

// Comptes ONG (profile = ngo) qui consultent le tableau de bord d'un programme (migration 0023).
export const programManagers = pgTable("program_managers", {
  programId: integer("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
  proId: integer("pro_id").notNull().references(() => proAccounts.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ pk: primaryKey({ columns: [t.programId, t.proId] }) }));

// Rapports mensuels envoyés au bailleur (relus puis envoyés par GlowScan).
export const programReports = pgTable("program_reports", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
  month: varchar("month", { length: 7 }).notNull(),
  sentTo: text("sent_to"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Le relais choisit son dermatologue référent.
export const relayLinks = pgTable("relay_links", {
  relayId: integer("relay_id").primaryKey().references(() => proAccounts.id, { onDelete: "cascade" }),
  dermId: integer("derm_id").notNull().references(() => proAccounts.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const relayCases = pgTable("relay_cases", {
  id: serial("id").primaryKey(),
  relayId: integer("relay_id").notNull().references(() => proAccounts.id),
  dermId: integer("derm_id").references(() => proAccounts.id),
  centerName: text("center_name"),
  patientAge: integer("patient_age"),
  patientSex: varchar("patient_sex", { length: 1 }),
  zone: text("zone"),
  symptoms: text("symptoms"),
  photos: jsonb("photos").notNull().default([]),
  relayDiagnosis: text("relay_diagnosis").notNull(),                  // proposé AVANT de voir l'IA
  relayDiseaseCode: varchar("relay_disease_code", { length: 40 }),
  aiScanId: integer("ai_scan_id").references(() => scans.id),
  aiDiagnosis: text("ai_diagnosis"),
  aiConfidence: varchar("ai_confidence", { length: 10 }),
  tier: varchar("tier", { length: 10 }).notNull(),                     // simple | urgent
  priceFcfa: integer("price_fcfa").notNull().default(0),
  payer: varchar("payer", { length: 10 }).notNull(),                   // patient | program | none (cas autonome)
  programId: integer("program_id").references(() => programs.id),
  operatorTxnId: text("operator_txn_id"),
  status: varchar("status", { length: 20 }).notNull().default("awaiting_payment"), // awaiting_payment | awaiting_review | answered | autonomous | refund_due | refunded
  paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("pending"), // pending | verified | program | refunded
  paidAt: timestamp("paid_at"),
  dueAt: timestamp("due_at"),
  alertSentAt: timestamp("alert_sent_at"),
  dermVerdict: varchar("derm_verdict", { length: 10 }),                // confirm | correct
  dermDiagnosis: text("derm_diagnosis"),
  dermDiseaseCode: varchar("derm_disease_code", { length: 40 }),
  dermNote: text("derm_note"),                                         // la leçon du relais
  lessonTip: varchar("lesson_tip", { length: 40 }),
  answeredAt: timestamp("answered_at"),
  refundedAt: timestamp("refunded_at"),
  refundOperatorRef: text("refund_operator_ref"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const relayProgress = pgTable("relay_progress", {
  relayId: integer("relay_id").notNull().references(() => proAccounts.id, { onDelete: "cascade" }),
  diseaseCode: varchar("disease_code", { length: 40 }).notNull(),
  cases: integer("cases").notNull().default(0),
  agreements: integer("agreements").notNull().default(0),
  autonomousAt: timestamp("autonomous_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({ pk: primaryKey({ columns: [t.relayId, t.diseaseCode] }) }));

export type RelayCase = typeof relayCases.$inferSelect;
export type RelayProgress = typeof relayProgress.$inferSelect;

// ════════════════════════════════════════════════════════════════════════
// Confrères (migration 0024) — conversations entre dermatologues.
// « case » : lié à un avis payant sur cas complexe (table peer_reviews, SQL brut) ;
// « chat » : discussion libre. to_pro NULL tant qu'un « premier disponible » n'a pas accepté.
// ════════════════════════════════════════════════════════════════════════
export const peerThreads = pgTable("peer_threads", {
  id: serial("id").primaryKey(),
  fromPro: integer("from_pro").notNull().references(() => proAccounts.id, { onDelete: "cascade" }),
  toPro: integer("to_pro").references(() => proAccounts.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 10 }).notNull(),
  caseId: integer("case_id"),
  unreadFrom: integer("unread_from").notNull().default(0),
  unreadTo: integer("unread_to").notNull().default(0),
  lastMessageAt: timestamp("last_message_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const peerMessages = pgTable("peer_messages", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").notNull().references(() => peerThreads.id, { onDelete: "cascade" }),
  authorPro: integer("author_pro").notNull().references(() => proAccounts.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 10 }).notNull().default("text"), // text | avis | system
  body: text("body"),
  structured: jsonb("structured"),                                   // { answer, dx, ddx, plan }
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Compte rendu en 3 versions + ordonnance (étape 9a, migration 0025) ──
// Une seule saisie du médecin (payload, cf. shared/report.ts) → version patient,
// dossier du cabinet et ordonnance. Figé à la signature (code à 4 chiffres).
export const consultReports = pgTable("consult_reports", {
  id: serial("id").primaryKey(),
  proAccountId: integer("pro_account_id").notNull().references(() => proAccounts.id, { onDelete: "cascade" }),
  source: varchar("source", { length: 20 }).notNull(),               // consultation | visit
  consultationId: integer("consultation_id").references(() => consultations.id, { onDelete: "cascade" }),
  patientId: integer("patient_id").references(() => patients.id, { onDelete: "cascade" }),
  payload: jsonb("payload").notNull().default({}),
  signedAt: timestamp("signed_at"),
  sentPatientAt: timestamp("sent_patient_at"),
  viewedBy: text("viewed_by").array().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Ordonnance : référence GS-ORD-xxxxx vérifiable sur /verif/:ref.
export const prescriptions = pgTable("prescriptions", {
  id: serial("id").primaryKey(),
  ref: varchar("ref", { length: 20 }).notNull().unique(),
  reportId: integer("report_id").notNull().unique().references(() => consultReports.id, { onDelete: "cascade" }),
  proAccountId: integer("pro_account_id").notNull().references(() => proAccounts.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 10 }).notNull().default("valid"), // valid | revoked
  signedAt: timestamp("signed_at").notNull().defaultNow(),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
