import { db } from "./db";
import { eq, desc, sql, count, gte, and, sum, lt, inArray } from "drizzle-orm";
import { scans, users, pageVisits, whatsappClicks, orders, loyaltyPoints, loyaltyRewards, pushSubscriptions, challenges, partners, partnerProducts, routines, routineSteps, routineCompletions, featuredProducts, personalizedTipsCache, subscriptions, premiumRequests, referrals, leads, wellnessLogs, type Scan, type InsertScan, type User, type InsertPageVisit, type InsertWhatsappClick, type Order, type InsertOrder, type LoyaltyPoint, type InsertLoyaltyPoint, type LoyaltyReward, type InsertLoyaltyReward, type PushSubscription, type InsertPushSubscription, type Challenge, type InsertChallenge, type Partner, type InsertPartner, type PartnerProduct, type InsertPartnerProduct, type Routine, type InsertRoutine, type RoutineStep, type InsertRoutineStep, type RoutineCompletion, type FeaturedProduct, type PersonalizedTipsCache } from "@shared/schema";

export type AnalyticsPeriod = "today" | "week" | "month" | "all";

export interface IStorage {
  createScan(scan: InsertScan): Promise<Scan>;
  getScansByUser(userId: string): Promise<Scan[]>;
  getScan(id: number): Promise<Scan | undefined>;
  linkAnonymousScansToUser(sessionId: string, userId: string): Promise<number>;
  getUser(id: string): Promise<User | undefined>;
  recordPageVisit(visit: InsertPageVisit): Promise<void>;
  recordWhatsappClick(click: InsertWhatsappClick): Promise<void>;
  createOrder(order: InsertOrder): Promise<Order>;
  getOrdersByUser(userId: string): Promise<Order[]>;
  getAllOrders(period?: AnalyticsPeriod): Promise<Order[]>;
  getAnalyticsStats(period?: AnalyticsPeriod): Promise<any>;
  addLoyaltyPoints(entry: InsertLoyaltyPoint): Promise<LoyaltyPoint>;
  getUserPoints(userId: string): Promise<number>;
  getUserPointsHistory(userId: string): Promise<LoyaltyPoint[]>;
  getUserRewards(userId: string): Promise<LoyaltyReward[]>;
  createReward(reward: InsertLoyaltyReward): Promise<LoyaltyReward>;
  hasPointsForReason(userId: string, reason: string, referenceId: string): Promise<boolean>;
  savePushSubscription(sub: InsertPushSubscription): Promise<PushSubscription>;
  getPushSubscriptionsByUser(userId: string): Promise<PushSubscription[]>;
  getAllActivePushSubscriptions(): Promise<PushSubscription[]>;
  deletePushSubscription(endpoint: string): Promise<void>;
  createChallenge(data: InsertChallenge): Promise<Challenge>;
  getChallenge(token: string): Promise<Challenge | undefined>;
  incrementChallengeAccepted(token: string): Promise<void>;
  getUsersWithStaleScans(daysSince: number): Promise<{ userId: string }[]>;
  getUsersWithScansBetweenHours(minHours: number, maxHours: number): Promise<{ userId: string }[]>;
  getTopChallenges(limit: number): Promise<Challenge[]>;
  // Partners
  createPartner(data: InsertPartner): Promise<Partner>;
  updatePartner(id: number, data: Partial<InsertPartner>): Promise<Partner>;
  getAllPartners(): Promise<Partner[]>;
  getActivePartners(): Promise<Partner[]>;
  createPartnerProduct(data: InsertPartnerProduct): Promise<PartnerProduct>;
  updatePartnerProduct(id: number, data: Partial<InsertPartnerProduct>): Promise<PartnerProduct>;
  getProductsByPartner(partnerId: number): Promise<PartnerProduct[]>;
  getAllPartnerProducts(): Promise<(PartnerProduct & { partnerName: string; partnerWhatsapp: string; partnerLocation: string })[]>;
  // Routines
  getRoutinesWithSteps(userId: string): Promise<(Routine & { steps: RoutineStep[] })[]>;
  upsertRoutine(userId: string, period: string, data: Partial<InsertRoutine>): Promise<Routine>;
  addRoutineStep(routineId: number, data: Omit<InsertRoutineStep, "routineId" | "position">): Promise<RoutineStep>;
  deleteRoutineStep(stepId: number, userId: string): Promise<void>;
  getRoutineStep(stepId: number): Promise<(RoutineStep & { userId: string; period: string }) | undefined>;
  getCompletionsForDate(userId: string, date: string): Promise<RoutineCompletion[]>;
  toggleCompletion(userId: string, stepId: number, date: string): Promise<{ done: boolean }>;
  getCompletionsBetween(userId: string, startDate: string, endDate: string): Promise<RoutineCompletion[]>;
  getAllRoutinesWithUserAndSteps(): Promise<(Routine & { steps: RoutineStep[] })[]>;
  // RGPD — droit d'accès & droit à l'effacement
  exportUserData(userId: string): Promise<Record<string, unknown>>;
  deleteUserAndAllData(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createScan(scan: InsertScan): Promise<Scan> {
    const [newScan] = await db.insert(scans).values(scan).returning();
    return newScan;
  }

  async getScansByUser(userId: string): Promise<Scan[]> {
    return db
      .select()
      .from(scans)
      .where(eq(scans.userId, userId))
      .orderBy(desc(scans.createdAt));
  }

  async getScan(id: number): Promise<Scan | undefined> {
    const [scan] = await db.select().from(scans).where(eq(scans.id, id));
    return scan;
  }

  async linkAnonymousScansToUser(sessionId: string, userId: string): Promise<number> {
    if (!sessionId || !userId) return 0;
    const result = await db
      .update(scans)
      .set({ userId })
      .where(and(eq(scans.sessionId, sessionId), sql`${scans.userId} IS NULL`))
      .returning({ id: scans.id });
    if (result.length > 0) {
      console.log(`[scans] 🔗 ${result.length} scan(s) anonyme(s) rattaché(s) à userId=${userId} (session=${sessionId})`);
    }
    return result.length;
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async recordPageVisit(visit: InsertPageVisit): Promise<void> {
    await db.insert(pageVisits).values(visit);
  }

  async recordWhatsappClick(click: InsertWhatsappClick): Promise<void> {
    await db.insert(whatsappClicks).values(click);
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async getOrdersByUser(userId: string): Promise<Order[]> {
    return db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));
  }

  async getAllOrders(period: AnalyticsPeriod = "all"): Promise<Order[]> {
    const startDate = this.getPeriodStartDate(period);
    const dateFilter = startDate ? gte(orders.createdAt, startDate) : undefined;
    const query = dateFilter
      ? db.select().from(orders).where(dateFilter).orderBy(desc(orders.createdAt)).limit(100)
      : db.select().from(orders).orderBy(desc(orders.createdAt)).limit(100);
    return query;
  }

  async addLoyaltyPoints(entry: InsertLoyaltyPoint): Promise<LoyaltyPoint> {
    const [point] = await db.insert(loyaltyPoints).values(entry).returning();
    return point;
  }

  async getUserPoints(userId: string): Promise<number> {
    const result = await db.select({ total: sql<number>`COALESCE(SUM(${loyaltyPoints.points}), 0)::integer` }).from(loyaltyPoints).where(eq(loyaltyPoints.userId, userId));
    return result[0]?.total || 0;
  }

  async getUserPointsHistory(userId: string): Promise<LoyaltyPoint[]> {
    return db.select().from(loyaltyPoints).where(eq(loyaltyPoints.userId, userId)).orderBy(desc(loyaltyPoints.createdAt));
  }

  async getUserRewards(userId: string): Promise<LoyaltyReward[]> {
    return db.select().from(loyaltyRewards).where(eq(loyaltyRewards.userId, userId)).orderBy(desc(loyaltyRewards.createdAt));
  }

  async createReward(reward: InsertLoyaltyReward): Promise<LoyaltyReward> {
    const [newReward] = await db.insert(loyaltyRewards).values(reward).returning();
    return newReward;
  }

  async hasPointsForReason(userId: string, reason: string, referenceId: string): Promise<boolean> {
    const existing = await db.select({ count: count() }).from(loyaltyPoints).where(and(eq(loyaltyPoints.userId, userId), eq(loyaltyPoints.reason, reason), eq(loyaltyPoints.referenceId, referenceId)));
    return (existing[0]?.count || 0) > 0;
  }

  async savePushSubscription(sub: InsertPushSubscription): Promise<PushSubscription> {
    const existing = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint));
    if (existing.length > 0) {
      const [updated] = await db.update(pushSubscriptions).set(sub).where(eq(pushSubscriptions.endpoint, sub.endpoint)).returning();
      return updated;
    }
    const [newSub] = await db.insert(pushSubscriptions).values(sub).returning();
    return newSub;
  }

  async getPushSubscriptionsByUser(userId: string): Promise<PushSubscription[]> {
    return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  }

  async getAllActivePushSubscriptions(): Promise<PushSubscription[]> {
    return db.select().from(pushSubscriptions);
  }

  async deletePushSubscription(endpoint: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  }

  private getPeriodStartDate(period: AnalyticsPeriod): Date | null {
    const now = new Date();
    switch (period) {
      case "today":
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case "week":
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        weekStart.setHours(0, 0, 0, 0);
        return weekStart;
      case "month":
        const monthStart = new Date(now);
        monthStart.setDate(now.getDate() - 30);
        monthStart.setHours(0, 0, 0, 0);
        return monthStart;
      default:
        return null;
    }
  }

  async getAnalyticsStats(period: AnalyticsPeriod = "all"): Promise<any> {
    const startDate = this.getPeriodStartDate(period);
    const visitDateFilter = startDate ? gte(pageVisits.createdAt, startDate) : undefined;
    const clickDateFilter = startDate ? gte(whatsappClicks.createdAt, startDate) : undefined;
    const scanDateFilter = startDate ? gte(scans.createdAt, startDate) : undefined;

    const visitQuery = visitDateFilter
      ? db.select({ count: count() }).from(pageVisits).where(visitDateFilter)
      : db.select({ count: count() }).from(pageVisits);
    const totalVisits = await visitQuery;

    const uniqueQuery = visitDateFilter
      ? db.select({ count: sql<number>`COUNT(DISTINCT ${pageVisits.sessionId})::integer` }).from(pageVisits).where(visitDateFilter)
      : db.select({ count: sql<number>`COUNT(DISTINCT ${pageVisits.sessionId})::integer` }).from(pageVisits);
    const uniqueVisitors = await uniqueQuery;

    const scanQuery = scanDateFilter
      ? db.select({ count: count() }).from(scans).where(scanDateFilter)
      : db.select({ count: count() }).from(scans);
    const totalAnalyses = await scanQuery;

    const clickCountQuery = clickDateFilter
      ? db.select({ count: count() }).from(whatsappClicks).where(clickDateFilter)
      : db.select({ count: count() }).from(whatsappClicks);
    const totalWhatsappClicks = await clickCountQuery;

    const visitsByCountryQuery = db
      .select({ country: pageVisits.country, count: count() })
      .from(pageVisits)
      .where(visitDateFilter ? sql`${pageVisits.country} IS NOT NULL AND ${pageVisits.createdAt} >= ${startDate}` : sql`${pageVisits.country} IS NOT NULL`)
      .groupBy(pageVisits.country)
      .orderBy(desc(count()));
    const visitsByCountry = await visitsByCountryQuery;

    const visitsByCityQuery = db
      .select({ city: pageVisits.city, country: pageVisits.country, count: count() })
      .from(pageVisits)
      .where(visitDateFilter ? sql`${pageVisits.city} IS NOT NULL AND ${pageVisits.createdAt} >= ${startDate}` : sql`${pageVisits.city} IS NOT NULL`)
      .groupBy(pageVisits.city, pageVisits.country)
      .orderBy(desc(count()));
    const visitsByCity = await visitsByCityQuery;

    const whatsappByBrandQuery = clickDateFilter
      ? db.select({ brand: whatsappClicks.brand, count: count() }).from(whatsappClicks).where(clickDateFilter).groupBy(whatsappClicks.brand).orderBy(desc(count()))
      : db.select({ brand: whatsappClicks.brand, count: count() }).from(whatsappClicks).groupBy(whatsappClicks.brand).orderBy(desc(count()));
    const whatsappByBrand = await whatsappByBrandQuery;

    const whatsappByProductQuery = clickDateFilter
      ? db.select({ productName: whatsappClicks.productName, brand: whatsappClicks.brand, count: count() }).from(whatsappClicks).where(clickDateFilter).groupBy(whatsappClicks.productName, whatsappClicks.brand).orderBy(desc(count()))
      : db.select({ productName: whatsappClicks.productName, brand: whatsappClicks.brand, count: count() }).from(whatsappClicks).groupBy(whatsappClicks.productName, whatsappClicks.brand).orderBy(desc(count()));
    const whatsappByProduct = await whatsappByProductQuery;

    const recentVisitsQuery = visitDateFilter
      ? db.select().from(pageVisits).where(visitDateFilter).orderBy(desc(pageVisits.createdAt)).limit(50)
      : db.select().from(pageVisits).orderBy(desc(pageVisits.createdAt)).limit(50);
    const recentVisits = await recentVisitsQuery;

    const recentWhatsappQuery = clickDateFilter
      ? db.select().from(whatsappClicks).where(clickDateFilter).orderBy(desc(whatsappClicks.createdAt)).limit(50)
      : db.select().from(whatsappClicks).orderBy(desc(whatsappClicks.createdAt)).limit(50);
    const recentWhatsappClicks = await recentWhatsappQuery;

    const visitsByDayQuery = period === "month"
      ? db
          .select({
            day: sql<string>`TO_CHAR(${pageVisits.createdAt}, 'IYYY-"S"IW')`,
            count: count(),
          })
          .from(pageVisits)
          .where(visitDateFilter || sql`TRUE`)
          .groupBy(sql`TO_CHAR(${pageVisits.createdAt}, 'IYYY-"S"IW')`)
          .orderBy(sql`TO_CHAR(${pageVisits.createdAt}, 'IYYY-"S"IW')`)
      : db
          .select({
            day: sql<string>`TO_CHAR(${pageVisits.createdAt}, 'YYYY-MM-DD')`,
            count: count(),
          })
          .from(pageVisits)
          .where(visitDateFilter || sql`TRUE`)
          .groupBy(sql`TO_CHAR(${pageVisits.createdAt}, 'YYYY-MM-DD')`)
          .orderBy(sql`TO_CHAR(${pageVisits.createdAt}, 'YYYY-MM-DD')`);
    const visitsByDay = await visitsByDayQuery;

    const orderDateFilter = startDate ? gte(orders.createdAt, startDate) : undefined;

    const totalOrdersQuery = orderDateFilter
      ? db.select({ count: count() }).from(orders).where(orderDateFilter)
      : db.select({ count: count() }).from(orders);
    const totalOrders = await totalOrdersQuery;

    const orderRevenueQuery = orderDateFilter
      ? db.select({ total: sql<number>`COALESCE(SUM(${orders.totalPrice}), 0)::integer` }).from(orders).where(orderDateFilter)
      : db.select({ total: sql<number>`COALESCE(SUM(${orders.totalPrice}), 0)::integer` }).from(orders);
    const orderRevenue = await orderRevenueQuery;

    const ordersByBrandQuery = orderDateFilter
      ? db.select({ brand: orders.brand, count: count(), revenue: sql<number>`COALESCE(SUM(${orders.totalPrice}), 0)::integer` }).from(orders).where(orderDateFilter).groupBy(orders.brand).orderBy(desc(count()))
      : db.select({ brand: orders.brand, count: count(), revenue: sql<number>`COALESCE(SUM(${orders.totalPrice}), 0)::integer` }).from(orders).groupBy(orders.brand).orderBy(desc(count()));
    const ordersByBrand = await ordersByBrandQuery;

    const recentOrdersQuery = orderDateFilter
      ? db.select().from(orders).where(orderDateFilter).orderBy(desc(orders.createdAt)).limit(50)
      : db.select().from(orders).orderBy(desc(orders.createdAt)).limit(50);
    const recentOrders = await recentOrdersQuery;

    // Visites dernières 6h
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const visits6hResult = await db.select({ count: count() }).from(pageVisits).where(gte(pageVisits.createdAt, sixHoursAgo));
    const visits6h = Number(visits6hResult[0]?.count ?? 0);

    // Visites dernières 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const visits24hResult = await db.select({ count: count() }).from(pageVisits).where(gte(pageVisits.createdAt, oneDayAgo));
    const visits24h = Number(visits24hResult[0]?.count ?? 0);

    return {
      totalVisits: totalVisits[0]?.count || 0,
      uniqueVisitors: uniqueVisitors[0]?.count || 0,
      visits6h,
      visits24h,
      totalAnalyses: totalAnalyses[0]?.count || 0,
      totalWhatsappClicks: totalWhatsappClicks[0]?.count || 0,
      totalOrders: totalOrders[0]?.count || 0,
      orderRevenue: orderRevenue[0]?.total || 0,
      ordersByBrand,
      recentOrders,
      visitsByCountry,
      visitsByCity,
      whatsappByBrand,
      whatsappByProduct,
      recentVisits,
      recentWhatsappClicks,
      visitsByDay,
      period,
    };
  }

  async createChallenge(data: InsertChallenge): Promise<Challenge> {
    const [ch] = await db.insert(challenges).values(data).returning();
    return ch;
  }

  async getChallenge(token: string): Promise<Challenge | undefined> {
    const [ch] = await db.select().from(challenges).where(eq(challenges.token, token));
    return ch;
  }

  async incrementChallengeAccepted(token: string): Promise<void> {
    await db
      .update(challenges)
      .set({ acceptedCount: sql`${challenges.acceptedCount} + 1` })
      .where(eq(challenges.token, token));
  }

  async getUsersWithStaleScans(daysSince: number): Promise<{ userId: string }[]> {
    const cutoff = new Date(Date.now() - daysSince * 24 * 60 * 60 * 1000);
    const result = await db
      .selectDistinct({ userId: scans.userId })
      .from(scans)
      .where(and(
        lt(scans.createdAt, cutoff),
        sql`${scans.userId} IS NOT NULL`
      ));
    return result.filter(r => r.userId) as { userId: string }[];
  }

  async getTopChallenges(limit: number): Promise<Challenge[]> {
    return db.select().from(challenges).orderBy(desc(challenges.score)).limit(limit);
  }

  async getUsersWithScansBetweenHours(minHours: number, maxHours: number): Promise<{ userId: string }[]> {
    const minCutoff = new Date(Date.now() - maxHours * 60 * 60 * 1000);
    const maxCutoff = new Date(Date.now() - minHours * 60 * 60 * 1000);
    const result = await db
      .selectDistinct({ userId: scans.userId })
      .from(scans)
      .where(and(
        gte(scans.createdAt, minCutoff),
        lt(scans.createdAt, maxCutoff),
        sql`${scans.userId} IS NOT NULL`
      ));
    return result.filter(r => r.userId) as { userId: string }[];
  }

  async createPartner(data: InsertPartner): Promise<Partner> {
    const [p] = await db.insert(partners).values(data).returning();
    return p;
  }

  async updatePartner(id: number, data: Partial<InsertPartner>): Promise<Partner> {
    const [p] = await db.update(partners).set(data).where(eq(partners.id, id)).returning();
    return p;
  }

  async getAllPartners(): Promise<Partner[]> {
    return db.select().from(partners).orderBy(desc(partners.createdAt));
  }

  async getActivePartners(): Promise<Partner[]> {
    return db.select().from(partners).where(eq(partners.active, true)).orderBy(partners.name);
  }

  async createPartnerProduct(data: InsertPartnerProduct): Promise<PartnerProduct> {
    const [p] = await db.insert(partnerProducts).values(data).returning();
    return p;
  }

  async updatePartnerProduct(id: number, data: Partial<InsertPartnerProduct>): Promise<PartnerProduct> {
    const [p] = await db.update(partnerProducts).set(data).where(eq(partnerProducts.id, id)).returning();
    return p;
  }

  async getProductsByPartner(partnerId: number): Promise<PartnerProduct[]> {
    return db.select().from(partnerProducts).where(eq(partnerProducts.partnerId, partnerId)).orderBy(partnerProducts.name);
  }

  async getAllPartnerProducts(): Promise<(PartnerProduct & { partnerName: string; partnerWhatsapp: string; partnerLocation: string })[]> {
    const rows = await db
      .select({
        id: partnerProducts.id,
        partnerId: partnerProducts.partnerId,
        name: partnerProducts.name,
        category: partnerProducts.category,
        description: partnerProducts.description,
        price: partnerProducts.price,
        active: partnerProducts.active,
        createdAt: partnerProducts.createdAt,
        partnerName: partners.name,
        partnerWhatsapp: partners.whatsapp,
        partnerLocation: partners.location,
      })
      .from(partnerProducts)
      .innerJoin(partners, eq(partnerProducts.partnerId, partners.id))
      .where(and(eq(partnerProducts.active, true), eq(partners.active, true)))
      .orderBy(partners.name, partnerProducts.name);
    return rows;
  }

  // ===== Routines =====
  async getRoutinesWithSteps(userId: string): Promise<(Routine & { steps: RoutineStep[] })[]> {
    const rs = await db.select().from(routines).where(eq(routines.userId, userId));
    if (rs.length === 0) return [];
    const ids = rs.map((r) => r.id);
    const allSteps = await db.select().from(routineSteps).where(inArray(routineSteps.routineId, ids)).orderBy(routineSteps.position, routineSteps.id);
    return rs.map((r) => ({ ...r, steps: allSteps.filter((s) => s.routineId === r.id) }));
  }

  async upsertRoutine(userId: string, period: string, data: Partial<InsertRoutine>): Promise<Routine> {
    const [existing] = await db.select().from(routines).where(and(eq(routines.userId, userId), eq(routines.period, period)));
    if (existing) {
      if (Object.keys(data).length === 0) return existing;
      const [updated] = await db.update(routines).set(data).where(eq(routines.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(routines).values({ userId, period, ...data }).returning();
    return created;
  }

  async addRoutineStep(routineId: number, data: Omit<InsertRoutineStep, "routineId" | "position">): Promise<RoutineStep> {
    const [{ maxPos }] = await db.select({ maxPos: sql<number>`COALESCE(MAX(${routineSteps.position}), -1)` }).from(routineSteps).where(eq(routineSteps.routineId, routineId));
    const [step] = await db.insert(routineSteps).values({ ...data, routineId, position: (maxPos ?? -1) + 1 }).returning();
    return step;
  }

  async deleteRoutineStep(stepId: number, userId: string): Promise<void> {
    // sécurité : vérifier que l'étape appartient à une routine du user
    const owned = await db
      .select({ id: routineSteps.id })
      .from(routineSteps)
      .innerJoin(routines, eq(routineSteps.routineId, routines.id))
      .where(and(eq(routineSteps.id, stepId), eq(routines.userId, userId)));
    if (owned.length === 0) return;
    await db.delete(routineSteps).where(eq(routineSteps.id, stepId));
  }

  async getRoutineStep(stepId: number) {
    const rows = await db
      .select({
        id: routineSteps.id,
        routineId: routineSteps.routineId,
        kind: routineSteps.kind,
        label: routineSteps.label,
        productId: routineSteps.productId,
        position: routineSteps.position,
        createdAt: routineSteps.createdAt,
        userId: routines.userId,
        period: routines.period,
      })
      .from(routineSteps)
      .innerJoin(routines, eq(routineSteps.routineId, routines.id))
      .where(eq(routineSteps.id, stepId));
    return rows[0];
  }

  async getCompletionsForDate(userId: string, date: string): Promise<RoutineCompletion[]> {
    return db.select().from(routineCompletions).where(and(eq(routineCompletions.userId, userId), eq(routineCompletions.date, date)));
  }

  async toggleCompletion(userId: string, stepId: number, date: string): Promise<{ done: boolean }> {
    const [existing] = await db.select().from(routineCompletions).where(and(eq(routineCompletions.userId, userId), eq(routineCompletions.stepId, stepId), eq(routineCompletions.date, date)));
    if (existing) {
      await db.delete(routineCompletions).where(eq(routineCompletions.id, existing.id));
      return { done: false };
    }
    await db.insert(routineCompletions).values({ userId, stepId, date });
    return { done: true };
  }

  async getCompletionsBetween(userId: string, startDate: string, endDate: string): Promise<RoutineCompletion[]> {
    return db.select().from(routineCompletions).where(and(eq(routineCompletions.userId, userId), gte(routineCompletions.date, startDate), sql`${routineCompletions.date} <= ${endDate}`));
  }

  async getAllRoutinesWithUserAndSteps(): Promise<(Routine & { steps: RoutineStep[] })[]> {
    const rs = await db.select().from(routines).where(eq(routines.reminderEnabled, true));
    if (rs.length === 0) return [];
    const ids = rs.map((r) => r.id);
    const allSteps = await db.select().from(routineSteps).where(inArray(routineSteps.routineId, ids));
    return rs.map((r) => ({ ...r, steps: allSteps.filter((s) => s.routineId === r.id) }));
  }

  // ===== Featured products =====
  async getFeaturedProducts(): Promise<FeaturedProduct[]> {
    return db.select().from(featuredProducts).orderBy(featuredProducts.position);
  }

  async setFeaturedProducts(items: { productId: string; badge?: string | null }[]): Promise<FeaturedProduct[]> {
    await db.delete(featuredProducts);
    if (items.length === 0) return [];
    const rows = items.map((it, idx) => ({ productId: it.productId, position: idx, badge: it.badge ?? null }));
    return db.insert(featuredProducts).values(rows).returning();
  }

  // ===== Personalized tips cache =====
  async getCachedTips(userId: string): Promise<PersonalizedTipsCache | undefined> {
    const [c] = await db.select().from(personalizedTipsCache).where(eq(personalizedTipsCache.userId, userId));
    return c;
  }

  async setCachedTips(userId: string, scanId: number | null, tips: string[]): Promise<void> {
    await db
      .insert(personalizedTipsCache)
      .values({ userId, scanId, tips, generatedAt: new Date() })
      .onConflictDoUpdate({
        target: personalizedTipsCache.userId,
        set: { scanId, tips, generatedAt: new Date() },
      });
  }

  // ===== RGPD : export complet (droit d'accès & portabilité, art. 15 & 20) =====
  async exportUserData(userId: string): Promise<Record<string, unknown>> {
    const safe = async <T>(p: Promise<T>, fallback: T): Promise<T> => {
      try { return await p; } catch { return fallback; }
    };

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");

    const userScans = await safe(db.select().from(scans).where(eq(scans.userId, userId)), [] as any[]);
    const userOrders = await safe(db.select().from(orders).where(eq(orders.userId, userId)), [] as any[]);
    const userPoints = await safe(db.select().from(loyaltyPoints).where(eq(loyaltyPoints.userId, userId)), [] as any[]);
    const userRewards = await safe(db.select().from(loyaltyRewards).where(eq(loyaltyRewards.userId, userId)), [] as any[]);
    const userPush = await safe(db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId)), [] as any[]);
    const userSubs = await safe(db.select().from(subscriptions).where(eq(subscriptions.userId, userId)), [] as any[]);
    const userPremReq = await safe(db.select().from(premiumRequests).where(eq(premiumRequests.userId, userId)), [] as any[]);
    const userLeads = await safe(db.select().from(leads).where(eq(leads.userId, userId)), [] as any[]);
    const userWellness = await safe(db.select().from(wellnessLogs).where(eq(wellnessLogs.userId, userId)), [] as any[]);
    const userRoutines = await safe(db.select().from(routines).where(eq(routines.userId, userId)), [] as any[]);
    const userCompletions = await safe(db.select().from(routineCompletions).where(eq(routineCompletions.userId, userId)), [] as any[]);
    const userReferralsOut = await safe(db.select().from(referrals).where(eq(referrals.referrerId, userId)), [] as any[]);
    const userReferralsIn = await safe(db.select().from(referrals).where(eq(referrals.referredId, userId)), [] as any[]);

    return {
      exportedAt: new Date().toISOString(),
      notice: "Export RGPD — vos données personnelles sur GlowScan. Conformément aux articles 15 et 20 du RGPD.",
      profile: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      scans: userScans,
      orders: userOrders,
      loyalty: { points: userPoints, rewards: userRewards },
      subscriptions: userSubs,
      premiumRequests: userPremReq,
      pushSubscriptions: userPush,
      leads: userLeads,
      wellnessLogs: userWellness,
      routines: userRoutines,
      routineCompletions: userCompletions,
      referrals: { asReferrer: userReferralsOut, asReferred: userReferralsIn },
    };
  }

  // ===== RGPD : suppression complète du compte (droit à l'effacement, art. 17) =====
  // ATOMIQUE : tout dans une transaction. Si une suppression échoue, rollback complet.
  // Inclut la révocation de TOUTES les sessions du user (pas seulement la session courante).
  // Note: les conversations/messages du chat ne sont pas attachées à un userId
  // (tables sans FK user). Elles ne sont donc pas supprimées ici.
  async deleteUserAndAllData(userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Ordre : enfants d'abord, puis user.
      await tx.delete(routineCompletions).where(eq(routineCompletions.userId, userId));
      await tx.delete(routines).where(eq(routines.userId, userId)); // steps cascade via routineId
      await tx.delete(personalizedTipsCache).where(eq(personalizedTipsCache.userId, userId));
      await tx.delete(wellnessLogs).where(eq(wellnessLogs.userId, userId));
      await tx.delete(leads).where(eq(leads.userId, userId));
      await tx.delete(premiumRequests).where(eq(premiumRequests.userId, userId));
      await tx.delete(subscriptions).where(eq(subscriptions.userId, userId));
      await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
      await tx.delete(loyaltyRewards).where(eq(loyaltyRewards.userId, userId));
      await tx.delete(loyaltyPoints).where(eq(loyaltyPoints.userId, userId));
      await tx.delete(orders).where(eq(orders.userId, userId));
      await tx.delete(scans).where(eq(scans.userId, userId));
      await tx.delete(referrals).where(eq(referrals.referrerId, userId));
      await tx.delete(referrals).where(eq(referrals.referredId, userId));
      await tx.delete(challenges).where(eq(challenges.challengerUserId, userId));

      // Révocation de TOUTES les sessions actives (custom auth ET Replit OIDC)
      // Le payload `sess` (jsonb) contient soit `userId`, soit `passport.user.claims.sub`.
      await tx.execute(sql`
        DELETE FROM sessions
        WHERE sess->>'userId' = ${userId}
           OR sess->'passport'->'user'->>'id' = ${userId}
           OR sess->'passport'->'user'->'claims'->>'sub' = ${userId}
      `);

      // Enfin l'utilisateur
      await tx.delete(users).where(eq(users.id, userId));
    });
  }

  // ====== RLHF / Dataset Pipeline (expert review) ======
  async getDatasetScans(opts: {
    status?: "all" | "pending" | "verified" | "rejected";
    area?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: Scan[]; total: number }> {
    const page = Math.max(1, opts.page || 1);
    const limit = Math.min(100, Math.max(1, opts.limit || 20));
    const offset = (page - 1) * limit;

    const conds: any[] = [];
    if (opts.status === "verified") conds.push(eq(scans.isVerified, true));
    else if (opts.status === "rejected") conds.push(and(eq(scans.isVerified, false), sql`${scans.expertReviewedAt} IS NOT NULL`));
    else if (opts.status === "pending") conds.push(and(eq(scans.isVerified, false), sql`${scans.expertReviewedAt} IS NULL`));
    if (opts.area && opts.area !== "all") conds.push(eq(scans.area, opts.area));
    // ⚠️ Le médecin doit pouvoir VOIR la photo pour valider — on n'expose que les scans
    // dont l'image est correctement archivée dans Object Storage.
    conds.push(sql`${scans.imageUrl} LIKE '/objects/scans/%'`);

    const whereClause = conds.length ? and(...conds) : undefined;

    const items = await db.select().from(scans)
      .where(whereClause as any)
      .orderBy(desc(scans.createdAt))
      .limit(limit).offset(offset);

    const totalRow = await db.select({ c: count() }).from(scans).where(whereClause as any);
    return { items, total: totalRow[0]?.c ?? 0 };
  }

  async getDatasetStats(): Promise<{
    total: number; verified: number; rejected: number; pending: number;
    withImage: number; byArea: Record<string, number>;
  }> {
    const [tot] = await db.select({ c: count() }).from(scans);
    const [ver] = await db.select({ c: count() }).from(scans).where(eq(scans.isVerified, true));
    const [rej] = await db.select({ c: count() }).from(scans)
      .where(and(eq(scans.isVerified, false), sql`${scans.expertReviewedAt} IS NOT NULL`));
    const [pen] = await db.select({ c: count() }).from(scans)
      .where(and(eq(scans.isVerified, false), sql`${scans.expertReviewedAt} IS NULL`));
    const [img] = await db.select({ c: count() }).from(scans)
      .where(sql`${scans.imageUrl} LIKE '/objects/scans/%'`);
    const areaRows = await db.select({ a: scans.area, c: count() }).from(scans).groupBy(scans.area);
    const byArea: Record<string, number> = {};
    for (const r of areaRows) byArea[r.a] = r.c;
    return {
      total: tot?.c ?? 0, verified: ver?.c ?? 0, rejected: rej?.c ?? 0, pending: pen?.c ?? 0,
      withImage: img?.c ?? 0, byArea,
    };
  }

  // Few-shot RLHF : récupère les corrections expertes les plus récentes pour
  // une zone donnée, afin de les injecter dans le prompt comme exemples.
  // Priorité absolue aux scans où l'expert a CORRIGÉ le diagnostic IA
  // (expert_corrected_condition non vide), car c'est là que l'IA s'est trompée.
  async getFewShotExamples(area: string, limit = 8): Promise<Array<{
    aiCondition: string;
    correctedCondition: string;
    expertNote: string | null;
    score: number;
  }>> {
    const rows = await db.select({
      condition: scans.condition,
      expertCorrectedCondition: scans.expertCorrectedCondition,
      expertNote: scans.expertNote,
      score: scans.score,
    }).from(scans)
      .where(and(
        eq(scans.area, area),
        eq(scans.isVerified, true),
        sql`${scans.expertCorrectedCondition} IS NOT NULL AND TRIM(${scans.expertCorrectedCondition}) <> ''`,
      ))
      .orderBy(desc(scans.expertReviewedAt))
      .limit(limit);

    return rows.map((r) => ({
      aiCondition: r.condition || "",
      correctedCondition: r.expertCorrectedCondition || "",
      expertNote: r.expertNote,
      score: r.score ?? 0,
    }));
  }

  async reviewScan(id: number, payload: {
    isVerified: boolean;
    expertNote?: string | null;
    expertCorrectedCondition?: string | null;
    expertReviewer?: string | null;
  }): Promise<Scan | undefined> {
    const [updated] = await db.update(scans).set({
      isVerified: payload.isVerified,
      expertNote: payload.expertNote ?? null,
      expertCorrectedCondition: payload.expertCorrectedCondition ?? null,
      expertReviewer: payload.expertReviewer ?? null,
      expertReviewedAt: new Date(),
    }).where(eq(scans.id, id)).returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
