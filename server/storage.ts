import { 
  users, products, payments, adminRequests, activityLogs, systemSettings, warnings,
  type User, type InsertUser, type Product, type InsertProduct, 
  type Payment, type InsertPayment, type AdminRequest, type InsertAdminRequest,
  type ActivityLog, type InsertActivityLog, type SystemSetting, type InsertSystemSetting,
  type Warning, type InsertWarning
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;

  // Products
  getAllProducts(): Promise<Product[]>;
  getActiveProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, updates: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;

  // Payments
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPayment(id: number): Promise<Payment | undefined>;
  getPendingPayments(): Promise<(Payment & { user: User; product: Product })[]>;
  getPaymentHistory(): Promise<(Payment & { user: User; product: Product })[]>;
  updatePaymentStatus(id: number, status: Payment["status"], approvedBy?: number, rejectionReason?: string): Promise<Payment | undefined>;

  // Admin Requests
  createAdminRequest(request: InsertAdminRequest): Promise<AdminRequest>;
  getPendingAdminRequests(): Promise<(AdminRequest & { user: User })[]>;
  updateAdminRequestStatus(id: number, status: AdminRequest["status"], approvedBy?: number): Promise<AdminRequest | undefined>;

  // Activity Logs
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(limit?: number): Promise<(ActivityLog & { user?: User })[]>;

  // System Settings
  getSetting(key: string): Promise<SystemSetting | undefined>;
  setSetting(key: string, value: any, updatedBy: number): Promise<SystemSetting>;

  // Warnings
  getActiveWarnings(): Promise<Warning[]>;
  createWarning(warning: InsertWarning): Promise<Warning>;
  updateWarning(id: number, updates: Partial<Warning>): Promise<Warning | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  // Products
  async getAllProducts(): Promise<Product[]> {
    return await db.select().from(products).orderBy(desc(products.createdAt));
  }

  async getActiveProducts(): Promise<Product[]> {
    return await db.select().from(products)
      .where(eq(products.isActive, true))
      .orderBy(desc(products.isFeatured), desc(products.createdAt));
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db
      .insert(products)
      .values({
        ...insertProduct,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return product;
  }

  async updateProduct(id: number, updates: Partial<Product>): Promise<Product | undefined> {
    const [product] = await db
      .update(products)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();
    return product || undefined;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Payments
  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const [payment] = await db
      .insert(payments)
      .values(insertPayment)
      .returning();
    return payment;
  }

  async getPayment(id: number): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment || undefined;
  }

  async getPendingPayments(): Promise<any[]> {
    const results = await db
      .select()
      .from(payments)
      .innerJoin(users, eq(payments.userId, users.id))
      .innerJoin(products, eq(payments.productId, products.id))
      .where(eq(payments.status, "pending"))
      .orderBy(desc(payments.createdAt));
    
    return results.map(row => ({
      ...row.payments,
      user: row.users,
      product: row.products
    }));
  }

  async getPaymentHistory(): Promise<any[]> {
    const results = await db
      .select()
      .from(payments)
      .innerJoin(users, eq(payments.userId, users.id))
      .innerJoin(products, eq(payments.productId, products.id))
      .where(or(eq(payments.status, "approved"), eq(payments.status, "rejected")))
      .orderBy(desc(payments.processedAt));
    
    return results.map(row => ({
      ...row.payments,
      user: row.users,
      product: row.products
    }));
  }

  async updatePaymentStatus(
    id: number, 
    status: Payment["status"], 
    approvedBy?: number, 
    rejectionReason?: string
  ): Promise<Payment | undefined> {
    const [payment] = await db
      .update(payments)
      .set({
        status,
        approvedBy,
        rejectionReason,
        processedAt: new Date(),
      })
      .where(eq(payments.id, id))
      .returning();
    return payment || undefined;
  }

  // Admin Requests
  async createAdminRequest(insertRequest: InsertAdminRequest): Promise<AdminRequest> {
    const [request] = await db
      .insert(adminRequests)
      .values(insertRequest)
      .returning();
    return request;
  }

  async getPendingAdminRequests(): Promise<any[]> {
    const results = await db
      .select()
      .from(adminRequests)
      .innerJoin(users, eq(adminRequests.userId, users.id))
      .where(eq(adminRequests.status, "pending"))
      .orderBy(desc(adminRequests.createdAt));
    
    return results.map(row => ({
      ...row.admin_requests,
      user: row.users
    }));
  }

  async updateAdminRequestStatus(
    id: number, 
    status: AdminRequest["status"], 
    approvedBy?: number
  ): Promise<AdminRequest | undefined> {
    const [request] = await db
      .update(adminRequests)
      .set({
        status,
        approvedBy,
        processedAt: new Date(),
      })
      .where(eq(adminRequests.id, id))
      .returning();
    return request || undefined;
  }

  // Activity Logs
  async createActivityLog(insertLog: InsertActivityLog): Promise<ActivityLog> {
    const [log] = await db
      .insert(activityLogs)
      .values(insertLog)
      .returning();
    return log;
  }

  async getActivityLogs(limit: number = 100): Promise<any[]> {
    const results = await db
      .select()
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.userId, users.id))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
    
    return results.map(row => ({
      ...row.activity_logs,
      user: row.users
    }));
  }

  // System Settings
  async getSetting(key: string): Promise<SystemSetting | undefined> {
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    return setting || undefined;
  }

  async setSetting(key: string, value: any, updatedBy: number): Promise<SystemSetting> {
    const existing = await this.getSetting(key);
    
    if (existing) {
      const [setting] = await db
        .update(systemSettings)
        .set({
          value,
          updatedAt: new Date(),
          updatedBy,
        })
        .where(eq(systemSettings.key, key))
        .returning();
      return setting;
    } else {
      const [setting] = await db
        .insert(systemSettings)
        .values({
          key,
          value,
          updatedBy,
        })
        .returning();
      return setting;
    }
  }

  // Warnings
  async getActiveWarnings(): Promise<Warning[]> {
    return await db
      .select()
      .from(warnings)
      .where(eq(warnings.isActive, true))
      .orderBy(desc(warnings.createdAt));
  }

  async createWarning(insertWarning: InsertWarning): Promise<Warning> {
    const [warning] = await db
      .insert(warnings)
      .values(insertWarning)
      .returning();
    return warning;
  }

  async updateWarning(id: number, updates: Partial<Warning>): Promise<Warning | undefined> {
    const [warning] = await db
      .update(warnings)
      .set(updates)
      .where(eq(warnings.id, id))
      .returning();
    return warning || undefined;
  }
}

export const storage = new DatabaseStorage();
