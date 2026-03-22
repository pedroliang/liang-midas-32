import {
  boolean,
  float,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Configurações de conexão com a mesa Midas M32.
 * Armazena o IP e a porta UDP para comunicação OSC.
 */
export const mixerConnections = mysqlTable("mixer_connections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 128 }).notNull().default("Midas M32"),
  ipAddress: varchar("ipAddress", { length: 64 }).notNull(),
  port: int("port").notNull().default(10023),
  isActive: boolean("isActive").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MixerConnection = typeof mixerConnections.$inferSelect;
export type InsertMixerConnection = typeof mixerConnections.$inferInsert;

/**
 * Presets de configuração da mesa.
 * Armazena snapshots completos do estado dos canais.
 */
export const presets = mysqlTable("presets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  data: json("data").notNull(), // JSON com estado completo dos canais
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Preset = typeof presets.$inferSelect;
export type InsertPreset = typeof presets.$inferInsert;

/**
 * Configurações individuais de canais (labels/cores).
 * Permite nomear e colorir os canais da mesa.
 */
export const channelConfigs = mysqlTable("channel_configs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  channelIndex: int("channelIndex").notNull(), // 1-32
  label: varchar("label", { length: 64 }),
  color: varchar("color", { length: 32 }),
  faderValue: float("faderValue").default(0.75).notNull(), // 0.0 a 1.0
  isMuted: boolean("isMuted").default(false).notNull(),
  isSolo: boolean("isSolo").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChannelConfig = typeof channelConfigs.$inferSelect;
export type InsertChannelConfig = typeof channelConfigs.$inferInsert;
