# GlowScan - AI Dermatological Analysis App

## Overview
GlowScan is an AI-powered dermatological analysis web application targeting the Francophone African market, particularly Cameroon. It allows users to upload photos for AI analysis of skin and hair conditions, providing a "Glow Score," diagnoses, and personalized product recommendations. Key features include a product shop, user profiles with scan history, engagement functionalities like challenges and wellness tracking, and a freemium model. The project aims to provide personalized skincare insights and product access, focusing on local relevance and user engagement.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Architecture
GlowScan uses a full-stack architecture with React (Vite) for the frontend and Express.js (Node.js) for the backend, supported by PostgreSQL with Drizzle ORM. Type safety and consistency are maintained using a shared route contract (`shared/routes.ts`) with Zod schemas. Authentication is handled by a custom email/password system.

### Frontend
The frontend is built with React 18, TypeScript, Vite, Wouter for routing, and TanStack React Query for server state. The UI/UX utilizes `shadcn/ui` (new-york style) on Radix UI and Tailwind CSS, featuring a "Rose & Noir" design system with an auto day/night theme based on Africa/Douala time. Key functionalities include image upload, a dynamic `ResultCard`, shareable visual cards, and a user profile with filterable scan history. The Home page offers personalized reminders, progress tracking, daily tips, and a DB-driven featured-products strip. Image resizing and retry mechanisms are implemented for network resilience in low-bandwidth environments.

### Result Pages
The analysis result pages (`MedicalReport.tsx`, `ResultCard.tsx`) are designed for clarity and actionability. `MedicalReport.tsx` provides a compact "medical ID card" format with diagnosis, Glow Score, metric pills, and product recommendations. `ResultCard.tsx` presents results in 4 vertical screens: Diagnostic, Bridge to products, Enriched product cards, and Pre-WhatsApp confirmation. The `/conseils` page offers personalized AI-generated tips based on the user's latest scan, with server-side caching.

### Backend
The backend is an Express.js with TypeScript RESTful JSON API. It integrates with the OpenAI API for dermatological image analysis, chat completions, and speech processing. It manages user authentication, scan data storage, chat features, push notifications, challenge mechanics, wellness logs, premium payment requests, routine management, and a nutriment scanner.

### Database
PostgreSQL with Drizzle ORM is used for data persistence. The schema is defined across `shared/schema.ts`, `shared/models/auth.ts`, `shared/models/chat.ts`. Key tables include `users`, `sessions`, `scans` (storing analysis results and recommendations as JSONB), `conversations`, `messages`, `push_subscriptions`, `challenges`, `wellness_logs`, and `premiumRequests`. `drizzle-kit push` is used for schema management.

### Stratégie "Zero data loss" sur les analyses (dataset dermato africain)
Chaque analyse dermatologique est l'actif stratégique de GlowScan. Règles côté `POST /api/analyze` :
- **Toute analyse est sauvegardée**, qu'elle vienne d'un utilisateur connecté OU anonyme/session expirée.
- Si `userId` est connu → enregistrement direct rattaché au compte.
- Sinon → enregistrement avec `sessionId = req.session.id` et `userId = NULL`. La colonne `scans.session_id` permet le rattachement ultérieur.
- À chaque `POST /api/auth/login` et `POST /api/auth/register`, on appelle `storage.linkAnonymousScansToUser(previousSessionId, userId)` qui exécute `UPDATE scans SET user_id = ? WHERE session_id = ? AND user_id IS NULL`. Ainsi tout scan fait avant connexion est automatiquement réuni au compte.
- Tout échec de sauvegarde est loggué avec `❌❌ ÉCHEC CRITIQUE` + contexte complet (userId, sessionId, condition, score, timestamp) — jamais swallow silencieux.
- La limite freemium "1 analyse anonyme gratuite" reste active via `req.session.anonymousScanUsed`, mais ne bloque PLUS la sauvegarde — elle bloque seulement les analyses futures.
- **Photos archivées dans Object Storage** : chaque image envoyée à `/api/analyze` est uploadée dans le bucket privé Replit (`PRIVATE_OBJECT_DIR/scans/<uuid>.<ext>`), et le chemin `/objects/scans/<uuid>.<ext>` est stocké dans `scans.image_url`. Helper : `uploadScanImageToStorage()` dans `server/routes.ts`. Échec d'upload → diagnostic sauvegardé quand même avec `imageUrl: ""` (le diagnostic prime sur la photo). Route de lecture `GET /objects/scans/:filename` exige auth + vérifie que le scan appartient à l'utilisateur (RGPD : photos médicales privées). Au rattachement anonyme→compte via `linkAnonymousScansToUser`, l'`imageUrl` est préservée donc la photo suit le diagnostic.

### Pipeline RLHF — validation dermato (dataset officiel)
Chaque scan possède désormais des champs `is_verified` (bool), `expert_note`, `expert_corrected_condition`, `expert_reviewer`, `expert_reviewed_at`. Le dermato passe par `/admin → onglet Dataset` :
- Routes serveur : `GET /api/admin/dataset?status=&area=&page=&limit=` (liste paginée), `GET /api/admin/dataset/stats` (compteurs), `POST /api/admin/dataset/:id/review` `{isVerified, note, correctedCondition, reviewer}`. Auth admin via `process.env.ADMIN_KEY` (fallback `"glowscan2024admin"` pour le dev) — la session est marquée `isAdmin=true` au passage, ce qui autorise ensuite `GET /objects/scans/:filename` à servir les photos sans exposer la clé admin dans l'URL.
- UI : grille de cartes (photo + diagnostic IA + champs note/corrected) avec boutons Valider / Rejeter, filtres status (pending/verified/rejected/all) + zone, badge sur l'onglet avec compteur "à valider".
- Statuts : pending = `!isVerified && reviewedAt IS NULL`, verified = `isVerified=true`, rejected = `!isVerified && reviewedAt NOT NULL`.
- Export : `npx tsx scripts/export-dataset.ts` (avec `PROD_DATABASE_URL`) génère `dataset/images/<id>.<ext>` + `dataset/labels.jsonl` ne contenant QUE les scans validés. Chaque ligne JSONL inclut le diagnostic IA original, la correction expert, et `label_final` = correction si fournie sinon condition IA.

### Authentication
A custom email/password authentication system uses bcrypt for password hashing and PostgreSQL-backed sessions via `connect-pg-simple`.

### Shared Code
This includes Drizzle table definitions, Zod schemas for API contracts, and the static product catalog (`catalog.ts`).

### Key Design Decisions
- **AI Integration**: Direct base64 image submission to OpenAI Vision API for dermatological analysis.
- **Product Catalog**: A static, curated product catalog (`shared/catalog.ts`) includes local and international brands. Product prices in the catalog reflect GlowScan's price (pharmacy price + fixed margin). All product orders are routed via WhatsApp.
- **Recommendation Badges**: Products display a "Recommandé pour ta peau" badge if they match the user's diagnosis.
- **Freemium Model**: Free scans with limited features, premium features via subscription.
- **Engaging UX**: Gamified challenges, daily wellness tracking, and personalized routines.
- **Content Gating**: Encourages user registration and premium subscriptions.
- **"Rose & Noir" Design System**: Custom design system with a specific color palette and African-centric imagery, featuring auto day/night theme.
- **Data Privacy (RGPD)**: Comprehensive data protection measures including a public privacy policy, a consent banner before the first scan, and user profile options for data export and account deletion.
- **Admin Tools**: An "Admin" page with a "Traction" dashboard for investor KPIs and a "Vedettes" tab for managing featured products on the homepage.

## External Dependencies

### Third-Party Services
- **PostgreSQL**: Primary database.
- **OpenAI API**: For AI dermatological analysis, chat, and speech processing.
- **WhatsApp**: For product inquiries and ordering.
- **Google Fonts**: For application typography.

### Key NPM Packages
- `drizzle-orm`, `drizzle-kit`
- `openai`
- `express`, `express-session`
- `@tanstack/react-query`
- `wouter`
- `framer-motion`
- `react-dropzone`
- `zod`, `drizzle-zod`
- `web-push`
- `shadcn/ui` components