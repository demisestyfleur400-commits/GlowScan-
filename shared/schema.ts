import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal, varchar } from "drizzle-orm/pg-core";
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
  // === GlowScan Pro — patient & contexte clinique ===
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
  status: text("status").notNull().default("envoyée"),
  createdAt: timestamp("created_at").defaultNow(),
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
  trialEndsAt: timestamp("trial_ends_at").notNull(),    // 14 jours après inscription
  subscriptionStatus: text("subscription_status").notNull().default("trial"), // trial | active | expired
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  onboardingDone: boolean("onboarding_done").default(false),
  consentSignedAt: timestamp("consent_signed_at").notNull(),
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
  lastScanAt: timestamp("last_scan_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProAccountSchema = createInsertSchema(proAccounts).omit({ id: true, createdAt: true });
export const insertPatientSchema = createInsertSchema(patients).omit({ id: true, createdAt: true, lastScanAt: true, status: true });
export type ProAccount = typeof proAccounts.$inferSelect;
export type InsertProAccount = z.infer<typeof insertProAccountSchema>;
export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

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
  primaryCondition: varchar("primary_condition", { length: 60 }),
  secondaryCondition: varchar("secondary_condition", { length: 60 }),

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

  // ── Label 15 — Facteurs visibles ─────────────────────────────────
  visibleFactors: jsonb("visible_factors"),                     // VisibleFactor[]

  // ── Label 16 — Diagnostics différentiels ─────────────────────────
  differentialDiagnosis: jsonb("differential_diagnosis"),       // DifferentialDiagnosis[]

  // ── Label 17 — Classes de recommandations ────────────────────────
  recommendationClasses: jsonb("recommendation_classes"),       // RecommendationClass[]

  // ── Diagnostic IA brut ───────────────────────────────────────────
  aiDiagnosis: jsonb("ai_diagnosis").notNull(),                 // JSON brut retourné par le modèle
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
  groundTruth: jsonb("ground_truth").notNull(),                 // GlowScanAnnotation validée
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
