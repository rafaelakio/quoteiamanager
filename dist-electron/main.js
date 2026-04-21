"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const child_process = require("child_process");
const net = require("net");
const os = require("os");
class ResetService {
  // Timezone utilities
  static getTimezones() {
    const timezones = [
      { value: "America/Sao_Paulo", label: "São Paulo", offset: "-03:00" },
      { value: "America/New_York", label: "New York", offset: "-05:00" },
      { value: "America/Los_Angeles", label: "Los Angeles", offset: "-08:00" },
      { value: "Europe/London", label: "London", offset: "+00:00" },
      { value: "Europe/Paris", label: "Paris", offset: "+01:00" },
      { value: "Europe/Berlin", label: "Berlin", offset: "+01:00" },
      { value: "Asia/Tokyo", label: "Tokyo", offset: "+09:00" },
      { value: "Asia/Shanghai", label: "Shanghai", offset: "+08:00" },
      { value: "Asia/Dubai", label: "Dubai", offset: "+04:00" },
      { value: "Australia/Sydney", label: "Sydney", offset: "+11:00" },
      { value: "UTC", label: "UTC", offset: "+00:00" }
    ];
    return timezones.map((tz) => ({
      ...tz,
      currentTime: (/* @__PURE__ */ new Date()).toLocaleString("pt-BR", { timeZone: tz.value })
    }));
  }
  // Date calculation utilities
  static getNextResetDate(config) {
    const now = /* @__PURE__ */ new Date();
    const [hours, minutes] = config.resetTime.split(":").map(Number);
    let nextReset = /* @__PURE__ */ new Date();
    config.timezone;
    switch (config.resetType) {
      case "daily":
        nextReset = new Date(now);
        nextReset.setHours(hours, minutes, 0, 0);
        if (nextReset <= now) {
          nextReset.setDate(nextReset.getDate() + 1);
        }
        break;
      case "weekly":
        nextReset = new Date(now);
        const currentDay = nextReset.getDay();
        const targetDay = config.resetDay || 1;
        let daysUntilTarget = (targetDay - currentDay + 7) % 7;
        if (daysUntilTarget === 0 && nextReset > new Date(now.setHours(hours, minutes, 0, 0))) {
          daysUntilTarget = 7;
        }
        nextReset.setDate(nextReset.getDate() + daysUntilTarget);
        nextReset.setHours(hours, minutes, 0, 0);
        break;
      case "monthly":
        nextReset = new Date(now.getFullYear(), now.getMonth(), config.resetDay || 1, hours, minutes, 0, 0);
        if (nextReset <= now) {
          nextReset = new Date(now.getFullYear(), now.getMonth() + 1, config.resetDay || 1, hours, minutes, 0, 0);
        }
        break;
      case "custom":
        if (config.nextResetAt) {
          nextReset = new Date(config.nextResetAt);
        } else {
          nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1, hours, minutes, 0, 0);
        }
        break;
    }
    return nextReset;
  }
  static getPeriodStart(config, referenceDate) {
    const ref = referenceDate || /* @__PURE__ */ new Date();
    const [hours, minutes] = config.resetTime.split(":").map(Number);
    let periodStart = new Date(ref);
    switch (config.resetType) {
      case "daily":
        periodStart.setHours(hours, minutes, 0, 0);
        if (periodStart > ref) {
          periodStart.setDate(periodStart.getDate() - 1);
        }
        break;
      case "weekly":
        const targetDay = config.resetDay || 1;
        const currentDay = periodStart.getDay();
        let daysToGoBack = (currentDay - targetDay + 7) % 7;
        if (daysToGoBack === 0 && periodStart.getHours() < hours) {
          daysToGoBack = 7;
        }
        periodStart.setDate(periodStart.getDate() - daysToGoBack);
        periodStart.setHours(hours, minutes, 0, 0);
        break;
      case "monthly":
        const targetDayOfMonth = config.resetDay || 1;
        if (periodStart.getDate() < targetDayOfMonth || periodStart.getDate() === targetDayOfMonth && periodStart.getHours() < hours) {
          periodStart.setMonth(periodStart.getMonth() - 1);
        }
        periodStart.setDate(targetDayOfMonth);
        periodStart.setHours(hours, minutes, 0, 0);
        break;
      case "custom":
        if (config.lastResetAt) {
          periodStart = new Date(config.lastResetAt);
        } else {
          periodStart.setDate(periodStart.getDate() - 30);
        }
        break;
    }
    return periodStart;
  }
  static getDaysUntilReset(config) {
    const nextReset = this.getNextResetDate(config);
    const now = /* @__PURE__ */ new Date();
    const diffTime = nextReset.getTime() - now.getTime();
    return Math.ceil(diffTime / (1e3 * 60 * 60 * 24));
  }
  // Reset configuration management
  static createResetConfig(config) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const nextReset = this.getNextResetDate(config);
    return {
      ...config,
      id: 0,
      // Will be set by database
      createdAt: now,
      updatedAt: now,
      nextResetAt: nextReset.toISOString()
    };
  }
  static updateResetConfig(config) {
    const nextReset = this.getNextResetDate(config);
    return {
      ...config,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      nextResetAt: nextReset.toISOString()
    };
  }
  // Reset execution
  static async performReset(providerId, config) {
    const periodStart = this.getPeriodStart(config);
    const periodEnd = /* @__PURE__ */ new Date();
    const usageRecords = getUsageRecords({
      providerId,
      startDate: periodStart.toISOString(),
      endDate: periodEnd.toISOString()
    });
    const totals = usageRecords.reduce((acc, record) => ({
      totalTokens: acc.totalTokens + record.total_tokens,
      totalRequests: acc.totalRequests + record.request_count,
      totalCost: acc.totalCost + record.cost_usd
    }), { totalTokens: 0, totalRequests: 0, totalCost: 0 });
    const resetHistory = {
      id: 0,
      // Will be set by database
      providerId,
      resetAt: (/* @__PURE__ */ new Date()).toISOString(),
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      totalTokens: totals.totalTokens,
      totalRequests: totals.totalRequests,
      totalCost: totals.totalCost,
      resetType: config.resetType,
      timezone: config.timezone
    };
    return resetHistory;
  }
  // Check for pending resets
  static getPendingResets(resetConfigs) {
    const now = /* @__PURE__ */ new Date();
    return resetConfigs.filter((config) => {
      if (!config.isActive) return false;
      const nextReset = new Date(config.nextResetAt || "");
      return nextReset <= now;
    });
  }
  // Get current period stats
  static getCurrentPeriodStats(providerId, config) {
    const periodStart = this.getPeriodStart(config);
    const now = /* @__PURE__ */ new Date();
    const usageRecords = getUsageRecords({
      providerId,
      startDate: periodStart.toISOString(),
      endDate: now.toISOString()
    });
    const stats = usageRecords.reduce((acc, record) => ({
      totalTokens: acc.totalTokens + record.total_tokens,
      inputTokens: acc.inputTokens + record.input_tokens,
      outputTokens: acc.outputTokens + record.output_tokens,
      requestCount: acc.requestCount + record.request_count,
      costUsd: acc.costUsd + record.cost_usd
    }), {
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      requestCount: 0,
      costUsd: 0
    });
    return {
      ...stats,
      startDate: periodStart.toISOString(),
      endDate: now.toISOString(),
      daysUntilReset: this.getDaysUntilReset(config),
      nextResetDate: this.getNextResetDate(config).toISOString()
    };
  }
}
let _db = null;
let _dbPath = "";
function dbPath() {
  if (_dbPath) return _dbPath;
  _dbPath = path.join(electron.app.getPath("userData"), "quoteiamanager.json");
  return _dbPath;
}
function loadDb() {
  if (_db) return _db;
  if (fs.existsSync(dbPath())) {
    try {
      _db = JSON.parse(fs.readFileSync(dbPath(), "utf-8"));
      migrateDb(_db);
      return _db;
    } catch {
    }
  }
  _db = {
    providers: [],
    usage: [],
    resetConfigs: [],
    resetHistory: [],
    settings: {
      theme: "system",
      currency: "USD",
      language: "pt-BR",
      notifications: "true",
      autoRefresh: "false",
      refreshInterval: "30"
    },
    nextProviderId: 1,
    nextUsageId: 1,
    nextResetConfigId: 1,
    nextResetHistoryId: 1
  };
  seedProviders(_db);
  saveDb();
  return _db;
}
function saveDb() {
  if (!_db) return;
  fs.writeFileSync(dbPath(), JSON.stringify(_db, null, 2), "utf-8");
}
function migrateDb(db) {
  const newProviders = [
    { name: "xAI (Grok)", slug: "xai", color: "#e11d48", icon: "zap", quota: 1e6, type: "tokens" },
    { name: "DeepSeek", slug: "deepseek", color: "#2563eb", icon: "cpu", quota: 1e6, type: "tokens" },
    { name: "GitHub Copilot", slug: "copilot", color: "#6e40c9", icon: "bot", quota: 300, type: "requests" },
    { name: "Amazon Kiro", slug: "kiro", color: "#FF9900", icon: "sparkles", quota: 20, type: "cost" },
    { name: "Devin (Cognition)", slug: "devin", color: "#3969CA", icon: "cpu", quota: 250, type: "requests" }
  ];
  const existingSlugs = new Set(db.providers.map((p) => p.slug));
  let changed = false;
  for (const s of newProviders) {
    if (!existingSlugs.has(s.slug)) {
      db.providers.push({
        id: db.nextProviderId++,
        name: s.name,
        slug: s.slug,
        color: s.color,
        icon: s.icon,
        api_key_hint: "",
        monthly_quota: s.quota,
        monthly_quota_type: s.type,
        alert_threshold: 0.8,
        is_active: 0,
        // inactive by default, user enables via onboarding
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      });
      changed = true;
    }
  }
  if (!db.resetConfigs) {
    db.resetConfigs = [];
    db.nextResetConfigId = 1;
    changed = true;
  }
  if (!db.resetHistory) {
    db.resetHistory = [];
    db.nextResetHistoryId = 1;
    changed = true;
  }
  if (!db.nextResetConfigId) {
    db.nextResetConfigId = 1;
    changed = true;
  }
  if (!db.nextResetHistoryId) {
    db.nextResetHistoryId = 1;
    changed = true;
  }
  if (changed) saveDb();
}
function seedProviders(db) {
  const seed = [
    { name: "OpenAI", slug: "openai", color: "#10a37f", icon: "bot", quota: 1e6, type: "tokens" },
    { name: "Anthropic", slug: "anthropic", color: "#d97706", icon: "brain", quota: 1e6, type: "tokens" },
    { name: "Google Gemini", slug: "google", color: "#4285f4", icon: "sparkles", quota: 1e6, type: "tokens" },
    { name: "Mistral AI", slug: "mistral", color: "#7c3aed", icon: "zap", quota: 1e6, type: "tokens" },
    { name: "Groq", slug: "groq", color: "#059669", icon: "cpu", quota: 5e5, type: "tokens" },
    { name: "Cohere", slug: "cohere", color: "#0891b2", icon: "layers", quota: 1e6, type: "tokens" },
    { name: "xAI (Grok)", slug: "xai", color: "#e11d48", icon: "zap", quota: 1e6, type: "tokens" },
    { name: "DeepSeek", slug: "deepseek", color: "#2563eb", icon: "cpu", quota: 1e6, type: "tokens" },
    { name: "GitHub Copilot", slug: "copilot", color: "#6e40c9", icon: "bot", quota: 300, type: "requests" },
    { name: "Amazon Kiro", slug: "kiro", color: "#FF9900", icon: "sparkles", quota: 20, type: "cost" },
    { name: "Devin (Cognition)", slug: "devin", color: "#3969CA", icon: "cpu", quota: 250, type: "requests" }
  ];
  for (const s of seed) {
    db.providers.push({
      id: db.nextProviderId++,
      name: s.name,
      slug: s.slug,
      color: s.color,
      icon: s.icon,
      api_key_hint: "",
      monthly_quota: s.quota,
      monthly_quota_type: s.type ?? "tokens",
      alert_threshold: 0.8,
      is_active: 1,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
}
function getProviders() {
  return loadDb().providers;
}
function addProvider(data) {
  const db = loadDb();
  const row = {
    id: db.nextProviderId++,
    name: data.name,
    slug: data.slug,
    color: data.color,
    icon: data.icon,
    api_key_hint: data.apiKeyHint,
    monthly_quota: data.monthlyQuota,
    monthly_quota_type: data.monthlyQuotaType,
    alert_threshold: data.alertThreshold,
    is_active: 1,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.providers.push(row);
  saveDb();
  return row;
}
function updateProvider(id, data) {
  const db = loadDb();
  const idx = db.providers.findIndex((p2) => p2.id === id);
  if (idx === -1) return null;
  const p = db.providers[idx];
  if (data.name !== void 0) p.name = data.name;
  if (data.slug !== void 0) p.slug = data.slug;
  if (data.color !== void 0) p.color = data.color;
  if (data.icon !== void 0) p.icon = data.icon;
  if (data.apiKeyHint !== void 0) p.api_key_hint = data.apiKeyHint;
  if (data.monthlyQuota !== void 0) p.monthly_quota = data.monthlyQuota;
  if (data.monthlyQuotaType !== void 0) p.monthly_quota_type = data.monthlyQuotaType;
  if (data.alertThreshold !== void 0) p.alert_threshold = data.alertThreshold;
  if (data.isActive !== void 0) p.is_active = data.isActive ? 1 : 0;
  saveDb();
  return p;
}
function deleteProvider(id) {
  const db = loadDb();
  db.providers = db.providers.filter((p) => p.id !== id);
  db.usage = db.usage.filter((u) => u.provider_id !== id);
  saveDb();
  return { success: true };
}
function getUsageRecords(filters) {
  const db = loadDb();
  let rows = db.usage.slice();
  if (filters == null ? void 0 : filters.providerId) rows = rows.filter((r) => r.provider_id === filters.providerId);
  if (filters == null ? void 0 : filters.startDate) rows = rows.filter((r) => r.used_at >= filters.startDate);
  if (filters == null ? void 0 : filters.endDate) rows = rows.filter((r) => r.used_at <= filters.endDate);
  rows.sort((a, b) => b.used_at.localeCompare(a.used_at));
  if (filters == null ? void 0 : filters.limit) rows = rows.slice(0, filters.limit);
  return rows.map((r) => {
    const p = db.providers.find((pr) => pr.id === r.provider_id);
    return { ...r, provider_name: (p == null ? void 0 : p.name) || "Desconhecido", provider_color: (p == null ? void 0 : p.color) || "#6366f1" };
  });
}
function addUsageRecord(data) {
  const db = loadDb();
  const row = {
    id: db.nextUsageId++,
    provider_id: data.providerId,
    model: data.model,
    input_tokens: data.inputTokens,
    output_tokens: data.outputTokens,
    total_tokens: data.totalTokens,
    request_count: data.requestCount,
    cost_usd: data.costUsd,
    used_at: data.usedAt,
    notes: data.notes
  };
  db.usage.push(row);
  saveDb();
  const p = db.providers.find((pr) => pr.id === data.providerId);
  return { ...row, provider_name: (p == null ? void 0 : p.name) || "", provider_color: (p == null ? void 0 : p.color) || "#6366f1" };
}
function deleteUsageRecord(id) {
  const db = loadDb();
  db.usage = db.usage.filter((u) => u.id !== id);
  saveDb();
  return { success: true };
}
function getProviderStats() {
  const db = loadDb();
  const now = /* @__PURE__ */ new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  return db.providers.filter((p) => p.is_active).map((p) => {
    const monthlyUsage = db.usage.filter((u) => u.provider_id === p.id && u.used_at >= startOfMonth);
    const agg = monthlyUsage.reduce(
      (acc, u) => ({
        totalTokens: acc.totalTokens + u.total_tokens,
        inputTokens: acc.inputTokens + u.input_tokens,
        outputTokens: acc.outputTokens + u.output_tokens,
        requestCount: acc.requestCount + u.request_count,
        costUsd: acc.costUsd + u.cost_usd
      }),
      { totalTokens: 0, inputTokens: 0, outputTokens: 0, requestCount: 0, costUsd: 0 }
    );
    const currentValue = p.monthly_quota_type === "tokens" ? agg.totalTokens : p.monthly_quota_type === "requests" ? agg.requestCount : agg.costUsd;
    const percentUsed = p.monthly_quota > 0 ? currentValue / p.monthly_quota : 0;
    return {
      providerId: p.id,
      providerName: p.name,
      providerColor: p.color,
      currentMonth: {
        totalTokens: agg.totalTokens,
        inputTokens: agg.inputTokens,
        outputTokens: agg.outputTokens,
        requestCount: agg.requestCount,
        costUsd: agg.costUsd
      },
      quota: p.monthly_quota,
      quotaType: p.monthly_quota_type,
      alertThreshold: p.alert_threshold,
      percentUsed,
      isOverQuota: percentUsed >= 1,
      isNearQuota: percentUsed >= p.alert_threshold && percentUsed < 1
    };
  });
}
function getDailyUsage(days = 30) {
  const db = loadDb();
  const since = /* @__PURE__ */ new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();
  const result = {};
  for (const u of db.usage.filter((u2) => u2.used_at >= sinceStr)) {
    const date = u.used_at.slice(0, 10);
    const p = db.providers.find((pr) => pr.id === u.provider_id);
    const pname = (p == null ? void 0 : p.name) || "Desconhecido";
    if (!result[date]) result[date] = {};
    if (!result[date][pname]) result[date][pname] = { date, total_tokens: 0, cost_usd: 0, request_count: 0, provider_name: pname };
    result[date][pname].total_tokens += u.total_tokens;
    result[date][pname].cost_usd += u.cost_usd;
    result[date][pname].request_count += u.request_count;
  }
  return Object.values(result).flatMap((byProvider) => Object.values(byProvider)).sort((a, b) => a.date.localeCompare(b.date));
}
function getSettings() {
  return loadDb().settings;
}
function updateSettings(settings) {
  const db = loadDb();
  Object.assign(db.settings, settings);
  saveDb();
  return db.settings;
}
function getResetConfigs(providerId) {
  const db = loadDb();
  let configs = db.resetConfigs.slice();
  if (providerId) {
    configs = configs.filter((c) => c.provider_id === providerId);
  }
  return configs.map((c) => ({
    id: c.id,
    providerId: c.provider_id,
    resetType: c.reset_type,
    resetDay: c.reset_day,
    resetTime: c.reset_time,
    timezone: c.timezone,
    isActive: Boolean(c.is_active),
    lastResetAt: c.last_reset_at,
    nextResetAt: c.next_reset_at,
    createdAt: c.created_at,
    updatedAt: c.updated_at
  }));
}
function addResetConfig(data) {
  const db = loadDb();
  const config = ResetService.createResetConfig({
    providerId: data.providerId,
    resetType: data.resetType,
    resetDay: data.resetDay,
    resetTime: data.resetTime,
    timezone: data.timezone,
    isActive: data.isActive,
    lastResetAt: void 0,
    nextResetAt: void 0,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  const row = {
    id: db.nextResetConfigId++,
    provider_id: config.providerId,
    reset_type: config.resetType,
    reset_day: config.resetDay,
    reset_time: config.resetTime,
    timezone: config.timezone,
    is_active: config.isActive ? 1 : 0,
    last_reset_at: config.lastResetAt,
    next_reset_at: config.nextResetAt,
    created_at: config.createdAt,
    updated_at: config.updatedAt
  };
  db.resetConfigs.push(row);
  saveDb();
  return {
    id: row.id,
    providerId: row.provider_id,
    resetType: row.reset_type,
    resetDay: row.reset_day,
    resetTime: row.reset_time,
    timezone: row.timezone,
    isActive: Boolean(row.is_active),
    lastResetAt: row.last_reset_at,
    nextResetAt: row.next_reset_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function updateResetConfig(id, data) {
  const db = loadDb();
  const idx = db.resetConfigs.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const config = db.resetConfigs[idx];
  if (data.resetType !== void 0) config.reset_type = data.resetType;
  if (data.resetDay !== void 0) config.reset_day = data.resetDay;
  if (data.resetTime !== void 0) config.reset_time = data.resetTime;
  if (data.timezone !== void 0) config.timezone = data.timezone;
  if (data.isActive !== void 0) config.is_active = data.isActive ? 1 : 0;
  config.updated_at = (/* @__PURE__ */ new Date()).toISOString();
  const configObj = {
    id: config.id,
    providerId: config.provider_id,
    resetType: config.reset_type,
    resetDay: config.reset_day,
    resetTime: config.reset_time,
    timezone: config.timezone,
    isActive: Boolean(config.is_active),
    lastResetAt: config.last_reset_at,
    nextResetAt: config.next_reset_at,
    createdAt: config.created_at,
    updatedAt: config.updated_at
  };
  const updated = ResetService.updateResetConfig(configObj);
  config.next_reset_at = updated.nextResetAt;
  saveDb();
  return {
    id: config.id,
    providerId: config.provider_id,
    resetType: config.reset_type,
    resetDay: config.reset_day,
    resetTime: config.reset_time,
    timezone: config.timezone,
    isActive: Boolean(config.is_active),
    lastResetAt: config.last_reset_at,
    nextResetAt: config.next_reset_at,
    createdAt: config.created_at,
    updatedAt: config.updated_at
  };
}
function deleteResetConfig(id) {
  const db = loadDb();
  db.resetConfigs = db.resetConfigs.filter((c) => c.id !== id);
  saveDb();
  return { success: true };
}
function getResetHistory(providerId, limit) {
  const db = loadDb();
  let history = db.resetHistory.slice();
  if (providerId) {
    history = history.filter((h) => h.provider_id === providerId);
  }
  history.sort((a, b) => b.reset_at.localeCompare(a.reset_at));
  if (limit) {
    history = history.slice(0, limit);
  }
  return history.map((h) => ({
    id: h.id,
    providerId: h.provider_id,
    resetAt: h.reset_at,
    periodStart: h.period_start,
    periodEnd: h.period_end,
    totalTokens: h.total_tokens,
    totalRequests: h.total_requests,
    totalCost: h.total_cost,
    resetType: h.reset_type,
    timezone: h.timezone
  }));
}
function addResetHistory(data) {
  const db = loadDb();
  const row = {
    id: db.nextResetHistoryId++,
    provider_id: data.providerId,
    reset_at: data.resetAt,
    period_start: data.periodStart,
    period_end: data.periodEnd,
    total_tokens: data.totalTokens,
    total_requests: data.totalRequests,
    total_cost: data.totalCost,
    reset_type: data.resetType,
    timezone: data.timezone
  };
  db.resetHistory.push(row);
  saveDb();
  return {
    id: row.id,
    providerId: row.provider_id,
    resetAt: row.reset_at,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    totalTokens: row.total_tokens,
    totalRequests: row.total_requests,
    totalCost: row.total_cost,
    resetType: row.reset_type,
    timezone: row.timezone
  };
}
async function performReset(providerId, configId) {
  const db = loadDb();
  const config = db.resetConfigs.find((c) => c.id === configId && c.provider_id === providerId);
  if (!config) {
    throw new Error("Reset configuration not found");
  }
  const configObj = {
    id: config.id,
    providerId: config.provider_id,
    resetType: config.reset_type,
    resetDay: config.reset_day,
    resetTime: config.reset_time,
    timezone: config.timezone,
    isActive: Boolean(config.is_active),
    lastResetAt: config.last_reset_at,
    nextResetAt: config.next_reset_at,
    createdAt: config.created_at,
    updatedAt: config.updated_at
  };
  const resetHistory = await ResetService.performReset(providerId, configObj);
  const historyRecord = addResetHistory({
    providerId: resetHistory.providerId,
    resetAt: resetHistory.resetAt,
    periodStart: resetHistory.periodStart,
    periodEnd: resetHistory.periodEnd,
    totalTokens: resetHistory.totalTokens,
    totalRequests: resetHistory.totalRequests,
    totalCost: resetHistory.totalCost,
    resetType: resetHistory.resetType,
    timezone: resetHistory.timezone
  });
  config.last_reset_at = resetHistory.resetAt;
  const updatedConfig = ResetService.updateResetConfig({
    ...configObj,
    lastResetAt: resetHistory.resetAt
  });
  config.next_reset_at = updatedConfig.nextResetAt;
  config.updated_at = updatedConfig.updatedAt;
  saveDb();
  return historyRecord;
}
function getTimezones() {
  return ResetService.getTimezones();
}
function getProviderStatsWithReset() {
  const db = loadDb();
  const providers = db.providers.filter((p) => p.is_active);
  return providers.map((p) => {
    const resetConfig = db.resetConfigs.find((c) => c.provider_id === p.id && c.is_active);
    let periodStats;
    if (resetConfig) {
      const configObj = {
        id: resetConfig.id,
        providerId: resetConfig.provider_id,
        resetType: resetConfig.reset_type,
        resetDay: resetConfig.reset_day,
        resetTime: resetConfig.reset_time,
        timezone: resetConfig.timezone,
        isActive: Boolean(resetConfig.is_active),
        lastResetAt: resetConfig.last_reset_at,
        nextResetAt: resetConfig.next_reset_at,
        createdAt: resetConfig.created_at,
        updatedAt: resetConfig.updated_at
      };
      periodStats = ResetService.getCurrentPeriodStats(p.id, configObj);
    } else {
      const now = /* @__PURE__ */ new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthlyUsage = db.usage.filter((u) => u.provider_id === p.id && u.used_at >= startOfMonth);
      periodStats = monthlyUsage.reduce(
        (acc, u) => ({
          totalTokens: acc.totalTokens + u.total_tokens,
          inputTokens: acc.inputTokens + u.input_tokens,
          outputTokens: acc.outputTokens + u.output_tokens,
          requestCount: acc.requestCount + u.request_count,
          costUsd: acc.costUsd + u.cost_usd,
          startDate: startOfMonth,
          endDate: now.toISOString(),
          daysUntilReset: void 0,
          nextResetDate: void 0
        }),
        {
          totalTokens: 0,
          inputTokens: 0,
          outputTokens: 0,
          requestCount: 0,
          costUsd: 0,
          startDate: startOfMonth,
          endDate: now.toISOString(),
          daysUntilReset: void 0,
          nextResetDate: void 0
        }
      );
    }
    const currentValue = p.monthly_quota_type === "tokens" ? periodStats.totalTokens : p.monthly_quota_type === "requests" ? periodStats.requestCount : periodStats.costUsd;
    const percentUsed = p.monthly_quota > 0 ? currentValue / p.monthly_quota : 0;
    return {
      providerId: p.id,
      providerName: p.name,
      providerColor: p.color,
      currentPeriod: {
        totalTokens: periodStats.totalTokens,
        inputTokens: periodStats.inputTokens,
        outputTokens: periodStats.outputTokens,
        requestCount: periodStats.requestCount,
        costUsd: periodStats.costUsd,
        startDate: periodStats.startDate,
        endDate: periodStats.endDate
      },
      quota: p.monthly_quota,
      quotaType: p.monthly_quota_type,
      alertThreshold: p.alert_threshold,
      percentUsed,
      isOverQuota: percentUsed >= 1,
      isNearQuota: percentUsed >= p.alert_threshold && percentUsed < 1,
      resetConfig: resetConfig ? {
        id: resetConfig.id,
        providerId: resetConfig.provider_id,
        resetType: resetConfig.reset_type,
        resetDay: resetConfig.reset_day,
        resetTime: resetConfig.reset_time,
        timezone: resetConfig.timezone,
        isActive: Boolean(resetConfig.is_active),
        lastResetAt: resetConfig.last_reset_at,
        nextResetAt: resetConfig.next_reset_at,
        createdAt: resetConfig.created_at,
        updatedAt: resetConfig.updated_at
      } : void 0,
      nextResetDate: periodStats.nextResetDate,
      daysUntilReset: periodStats.daysUntilReset
    };
  });
}
function getClaudeProjectsDir() {
  const candidates = [
    path.join(os.homedir(), ".claude", "projects"),
    // Windows AppData fallback
    process.env.APPDATA ? path.join(process.env.APPDATA, "Claude", "projects") : ""
  ].filter(Boolean);
  return candidates.find((p) => {
    try {
      return fs.statSync(p).isDirectory();
    } catch {
      return false;
    }
  }) ?? null;
}
function getOffsets() {
  try {
    const s = getSettings();
    return JSON.parse(s["_transcriptOffsets"] ?? "{}");
  } catch {
    return {};
  }
}
function saveOffsets(offsets) {
  updateSettings({ _transcriptOffsets: JSON.stringify(offsets) });
}
function getProcessedUuids() {
  try {
    const s = getSettings();
    const arr = JSON.parse(s["_processedUuids"] ?? "[]");
    return new Set(arr);
  } catch {
    return /* @__PURE__ */ new Set();
  }
}
function saveProcessedUuids(uuids) {
  const arr = [...uuids].slice(-5e4);
  updateSettings({ _processedUuids: JSON.stringify(arr) });
}
function resolveProviderSlug$1(model) {
  const m = model.toLowerCase();
  if (m.includes("claude")) return "anthropic";
  if (m.includes("gpt") || m.includes("o1") || m.includes("o3") || m.includes("o4") || m.includes("chatgpt")) return "openai";
  if (m.includes("gemini")) return "google";
  if (m.includes("mistral") || m.includes("mixtral") || m.includes("devstral") || m.includes("codestral")) return "mistral";
  if (m.includes("llama") || m.includes("qwen") || m.includes("deepseek") || m.includes("whisper")) return "groq";
  if (m.includes("command")) return "cohere";
  return "anthropic";
}
const PRICING$1 = {
  "claude-opus-4": [15, 75],
  "claude-sonnet-4-6": [3, 15],
  "claude-sonnet-4": [3, 15],
  "claude-haiku-4-5": [0.8, 4],
  "claude-haiku-4": [0.8, 4],
  "claude-3-7-sonnet": [3, 15],
  "claude-3-5-sonnet": [3, 15],
  "claude-3-5-haiku": [0.8, 4],
  "claude-3-opus": [15, 75],
  "claude-3-sonnet": [3, 15],
  "claude-3-haiku": [0.25, 1.25],
  "gpt-4o": [2.5, 10],
  "gpt-4o-mini": [0.15, 0.6],
  "gpt-4-turbo": [10, 30],
  "o1": [15, 60],
  "o3": [10, 40],
  "o4-mini": [1.1, 4.4],
  "gemini-2.5-pro": [1.25, 10],
  "gemini-2.0-flash": [0.1, 0.4],
  "gemini-1.5-pro": [1.25, 5],
  "mistral-large": [2, 6],
  "mistral-small": [0.1, 0.3]
};
function estimateCost$1(model, input, output) {
  const key = Object.keys(PRICING$1).find((k) => model.toLowerCase().startsWith(k));
  if (!key) return 0;
  const [inP, outP] = PRICING$1[key];
  return input / 1e6 * inP + output / 1e6 * outP;
}
function processTranscriptFile(filePath, offsets, processedUuids) {
  let newRecords = 0;
  try {
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const offset = offsets[filePath] ?? 0;
    if (fileSize <= offset) return { newRecords: 0, updatedOffsets: offsets };
    const fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(fileSize - offset);
    fs.readSync(fd, buf, 0, buf.length, offset);
    fs.closeSync(fd);
    const newContent = buf.toString("utf-8");
    const lines = newContent.split("\n").filter((l) => l.trim());
    const sessions = {};
    for (const line of lines) {
      let entry;
      try {
        entry = JSON.parse(line);
      } catch {
        continue;
      }
      if (entry.type !== "assistant") continue;
      const msg = entry.message;
      if (!(msg == null ? void 0 : msg.usage) || !(msg == null ? void 0 : msg.model)) continue;
      const uuid = entry.uuid ?? "";
      if (uuid && processedUuids.has(uuid)) continue;
      const sessionId = entry.sessionId ?? "unknown";
      const model = msg.model;
      const key = `${sessionId}::${model}`;
      if (!sessions[key]) {
        sessions[key] = {
          model,
          inputTokens: 0,
          outputTokens: 0,
          cacheCreate: 0,
          cacheRead: 0,
          messageUuids: /* @__PURE__ */ new Set(),
          sessionId,
          lastTimestamp: entry.timestamp ?? (/* @__PURE__ */ new Date()).toISOString()
        };
      }
      const s = sessions[key];
      s.inputTokens += msg.usage.input_tokens ?? 0;
      s.outputTokens += msg.usage.output_tokens ?? 0;
      s.cacheCreate += msg.usage.cache_creation_input_tokens ?? 0;
      s.cacheRead += msg.usage.cache_read_input_tokens ?? 0;
      if (uuid) s.messageUuids.add(uuid);
      if (entry.timestamp) s.lastTimestamp = entry.timestamp;
    }
    const providers = getProviders();
    for (const acc of Object.values(sessions)) {
      if (acc.inputTokens + acc.outputTokens + acc.cacheCreate + acc.cacheRead === 0) continue;
      const slug = resolveProviderSlug$1(acc.model);
      const provider = providers.find((p) => p.slug === slug) ?? providers.find((p) => p.slug === "anthropic");
      if (!provider) continue;
      const totalInput = acc.inputTokens + acc.cacheCreate + acc.cacheRead;
      const totalTokens = totalInput + acc.outputTokens;
      const cost = estimateCost$1(acc.model, totalInput, acc.outputTokens);
      addUsageRecord({
        providerId: provider.id,
        model: acc.model,
        inputTokens: totalInput,
        outputTokens: acc.outputTokens,
        totalTokens,
        requestCount: acc.messageUuids.size || 1,
        costUsd: cost,
        usedAt: acc.lastTimestamp,
        notes: `Auto-captura · sessão ${acc.sessionId.slice(0, 8)}`
      });
      for (const uid of acc.messageUuids) processedUuids.add(uid);
      newRecords++;
    }
    offsets[filePath] = fileSize;
  } catch (err) {
    console.error("[watcher] error processing", filePath, err);
  }
  return { newRecords, updatedOffsets: offsets };
}
function startTranscriptWatcher(getWindow) {
  const projectsDir = getClaudeProjectsDir();
  if (!projectsDir) {
    console.log("[watcher] Claude projects dir not found, skipping");
    return;
  }
  console.log("[watcher] watching", projectsDir);
  let offsets = getOffsets();
  let processedUuids = getProcessedUuids();
  let debounce = null;
  function processChangedFile(filePath) {
    if (!filePath.endsWith(".jsonl")) return;
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
      var _a;
      const result = processTranscriptFile(filePath, offsets, processedUuids);
      if (result.newRecords > 0) {
        offsets = result.updatedOffsets;
        saveOffsets(offsets);
        saveProcessedUuids(processedUuids);
        console.log(`[watcher] +${result.newRecords} records from ${path.basename(filePath)}`);
        (_a = getWindow()) == null ? void 0 : _a.webContents.send("usage:new", { source: "watcher", count: result.newRecords });
      }
    }, 1500);
  }
  function initialScan() {
    try {
      const projects = fs.readdirSync(projectsDir);
      for (const proj of projects) {
        const projPath = path.join(projectsDir, proj);
        try {
          if (!fs.statSync(projPath).isDirectory()) continue;
          const files = fs.readdirSync(projPath);
          for (const f of files) {
            if (!f.endsWith(".jsonl")) continue;
            const fp = path.join(projPath, f);
            const result = processTranscriptFile(fp, offsets, processedUuids);
            if (result.newRecords > 0) {
              offsets = result.updatedOffsets;
              console.log(`[watcher] initial scan +${result.newRecords} from ${f}`);
            }
          }
        } catch {
        }
      }
      if (Object.keys(offsets).length > 0) {
        saveOffsets(offsets);
        saveProcessedUuids(processedUuids);
      }
    } catch (e) {
      console.error("[watcher] initial scan error", e);
    }
  }
  initialScan();
  try {
    fs.watch(projectsDir, { recursive: true }, (_event, filename) => {
      if (!filename) return;
      const filePath = path.join(projectsDir, String(filename));
      processChangedFile(filePath);
    });
  } catch (e) {
    console.error("[watcher] fs.watch failed", e);
  }
  return projectsDir;
}
function syncAllTranscripts() {
  const projectsDir = getClaudeProjectsDir();
  if (!projectsDir) return 0;
  let offsets = getOffsets();
  const processedUuids = getProcessedUuids();
  let total = 0;
  try {
    const projects = fs.readdirSync(projectsDir);
    for (const proj of projects) {
      const projPath = path.join(projectsDir, proj);
      try {
        if (!fs.statSync(projPath).isDirectory()) continue;
        const files = fs.readdirSync(projPath);
        for (const f of files) {
          if (!f.endsWith(".jsonl")) continue;
          const fp = path.join(projPath, f);
          const result = processTranscriptFile(fp, offsets, processedUuids);
          offsets = result.updatedOffsets;
          total += result.newRecords;
        }
      } catch {
      }
    }
    saveOffsets(offsets);
    saveProcessedUuids(processedUuids);
  } catch (e) {
    console.error("[watcher] syncAll error", e);
  }
  return total;
}
function getDevinDbPath() {
  const candidates = [
    process.env.APPDATA ? path.join(process.env.APPDATA, "devin", "cli", "sessions.db") : "",
    path.join(os.homedir(), "AppData", "Roaming", "devin", "cli", "sessions.db"),
    path.join(os.homedir(), ".devin", "cli", "sessions.db")
  ].filter(Boolean);
  return candidates.find((p) => {
    try {
      return fs.statSync(p).isFile();
    } catch {
      return false;
    }
  }) ?? null;
}
function getLastRowId() {
  try {
    return parseInt(getSettings()["_devinLastRowId"] ?? "0", 10) || 0;
  } catch {
    return 0;
  }
}
function saveLastRowId(rowId) {
  updateSettings({ _devinLastRowId: String(rowId) });
}
function queryNewRecords(dbPath2, lastRowId) {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, "../scripts/devin-query.js");
    child_process.exec(`node "${scriptPath}" "${dbPath2}" ${lastRowId}`, { timeout: 15e3 }, (err, stdout) => {
      if (err) {
        resolve([]);
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch {
        resolve([]);
      }
    });
  });
}
function processRecords(records) {
  if (records.length === 0) return 0;
  const providers = getProviders();
  const devinProvider = providers.find((p) => p.slug === "devin");
  if (!devinProvider) {
    console.warn('[devin-watcher] "devin" provider not found in database');
    return 0;
  }
  const sessions = /* @__PURE__ */ new Map();
  for (const rec of records) {
    const key = rec.sessionId;
    const existing = sessions.get(key);
    if (existing) {
      existing.inputTokens += rec.inputTokens;
      existing.outputTokens += rec.outputTokens;
      existing.cacheRead += rec.cacheReadTokens;
      existing.cacheCreate += rec.cacheCreationTokens;
      existing.requestCount += 1;
      existing.lastCreatedAt = rec.createdAt;
    } else {
      sessions.set(key, {
        inputTokens: rec.inputTokens,
        outputTokens: rec.outputTokens,
        cacheRead: rec.cacheReadTokens,
        cacheCreate: rec.cacheCreationTokens,
        requestCount: 1,
        lastCreatedAt: rec.createdAt,
        model: rec.generationModel || rec.sessionModel || "devin-swe-1.5"
      });
    }
  }
  let stored = 0;
  for (const [sessionId, s] of sessions) {
    const totalInput = s.inputTokens + s.cacheRead + s.cacheCreate;
    const totalTokens = totalInput + s.outputTokens;
    if (totalTokens === 0 && s.requestCount === 0) continue;
    addUsageRecord({
      providerId: devinProvider.id,
      model: s.model,
      inputTokens: totalInput,
      outputTokens: s.outputTokens,
      totalTokens,
      requestCount: s.requestCount,
      costUsd: 0,
      // Devin is subscription-based
      usedAt: s.lastCreatedAt,
      notes: `Devin CLI · sessão ${sessionId.slice(0, 8)}`
    });
    stored++;
  }
  return stored;
}
function startDevinWatcher(getWindow) {
  const dbPath2 = getDevinDbPath();
  if (!dbPath2) {
    console.log("[devin-watcher] Devin sessions.db not found — skipping");
    return null;
  }
  console.log("[devin-watcher] watching", dbPath2);
  async function poll() {
    var _a;
    const lastRowId = getLastRowId();
    const records = await queryNewRecords(dbPath2, lastRowId);
    if (records.length === 0) return;
    const maxRowId = Math.max(...records.map((r) => r.rowId));
    const stored = processRecords(records);
    saveLastRowId(maxRowId);
    if (stored > 0) {
      console.log(`[devin-watcher] +${stored} records (${records.length} API calls, up to row ${maxRowId})`);
      (_a = getWindow()) == null ? void 0 : _a.webContents.send("usage:new", { source: "devin", count: stored });
    }
  }
  poll();
  const timer = setInterval(poll, 6e4);
  return () => clearInterval(timer);
}
async function syncDevinSessions() {
  const dbPath2 = getDevinDbPath();
  if (!dbPath2) return 0;
  const lastRowId = getLastRowId();
  const records = await queryNewRecords(dbPath2, lastRowId);
  if (records.length === 0) return 0;
  const maxRowId = Math.max(...records.map((r) => r.rowId));
  const stored = processRecords(records);
  saveLastRowId(maxRowId);
  return stored;
}
class ResetScheduler {
  constructor(mainWindow2) {
    __publicField(this, "intervalId", null);
    __publicField(this, "isRunning", false);
    __publicField(this, "mainWindow", null);
    this.mainWindow = mainWindow2;
  }
  start() {
    if (this.isRunning) {
      console.log("[ResetScheduler] Already running");
      return;
    }
    console.log("[ResetScheduler] Starting automated reset scheduler");
    this.isRunning = true;
    this.checkAndPerformResets();
    this.intervalId = setInterval(() => {
      this.checkAndPerformResets();
    }, 60 * 1e3);
  }
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log("[ResetScheduler] Stopped");
  }
  async checkAndPerformResets() {
    try {
      const resetConfigs = getResetConfigs();
      const pendingResets = ResetService.getPendingResets(resetConfigs);
      if (pendingResets.length > 0) {
        console.log(`[ResetScheduler] Found ${pendingResets.length} pending resets`);
        for (const config of pendingResets) {
          await this.performResetWithNotification(config);
        }
      }
    } catch (error) {
      console.error("[ResetScheduler] Error checking resets:", error);
    }
  }
  async performResetWithNotification(config) {
    try {
      console.log(`[ResetScheduler] Performing reset for provider ${config.providerId}`);
      const resetHistory = await performReset(config.providerId, config.id);
      this.sendNotification({
        type: "reset-completed",
        providerId: config.providerId,
        resetHistory,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      console.log(`[ResetScheduler] Reset completed for provider ${config.providerId}`);
    } catch (error) {
      console.error(`[ResetScheduler] Error performing reset for provider ${config.providerId}:`, error);
      this.sendNotification({
        type: "reset-error",
        providerId: config.providerId,
        error: error.message,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  }
  sendNotification(data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send("reset:scheduled", data);
    }
  }
  // Manual trigger for testing
  async triggerManualCheck() {
    console.log("[ResetScheduler] Manual trigger requested");
    await this.checkAndPerformResets();
  }
  // Get next scheduled resets info
  getNextScheduledResets() {
    const resetConfigs = getResetConfigs();
    const activeConfigs = resetConfigs.filter((config) => config.isActive);
    return activeConfigs.map((config) => ({
      providerId: config.providerId,
      nextReset: config.nextResetAt,
      resetType: config.resetType,
      timezone: config.timezone,
      minutesUntilReset: config.nextResetAt ? Math.ceil((new Date(config.nextResetAt).getTime() - (/* @__PURE__ */ new Date()).getTime()) / (1e3 * 60)) : null
    })).sort((a, b) => {
      if (!a.nextReset) return 1;
      if (!b.nextReset) return -1;
      return new Date(a.nextReset).getTime() - new Date(b.nextReset).getTime();
    });
  }
  getStatus() {
    return {
      isRunning: this.isRunning,
      nextChecks: this.getNextScheduledResets(),
      lastCheck: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
}
let schedulerInstance = null;
function initializeResetScheduler(mainWindow2) {
  if (schedulerInstance) {
    schedulerInstance.stop();
  }
  schedulerInstance = new ResetScheduler(mainWindow2);
  schedulerInstance.start();
  return schedulerInstance;
}
function getResetScheduler() {
  return schedulerInstance;
}
function shutdownResetScheduler() {
  if (schedulerInstance) {
    schedulerInstance.stop();
    schedulerInstance = null;
  }
}
electron.app.on("before-quit", () => {
  shutdownResetScheduler();
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    shutdownResetScheduler();
  }
});
const isDev = process.env.NODE_ENV === "development" || !electron.app.isPackaged;
const INGEST_PORT = 47821;
let mainWindow = null;
function startIngestServer() {
  const server = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.method !== "POST" || req.url !== "/usage") {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        const providerSlug = resolveProviderSlug(payload.model);
        const providers = getProviders();
        const provider = providers.find((p) => p.slug === providerSlug) ?? providers.find((p) => p.slug === "anthropic");
        if (provider) {
          const record = addUsageRecord({
            providerId: provider.id,
            model: payload.model,
            inputTokens: payload.inputTokens,
            outputTokens: payload.outputTokens,
            totalTokens: payload.inputTokens + payload.outputTokens,
            requestCount: 1,
            costUsd: payload.costUsd ?? estimateCost(payload.model, payload.inputTokens, payload.outputTokens),
            usedAt: (/* @__PURE__ */ new Date()).toISOString(),
            notes: `Claude Code — sessão ${payload.sessionId.slice(0, 8)}`
          });
          mainWindow == null ? void 0 : mainWindow.webContents.send("usage:new", record);
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400);
        res.end("Bad request");
      }
    });
  });
  server.listen(INGEST_PORT, "127.0.0.1", () => {
    console.log(`[ingest] listening on http://127.0.0.1:${INGEST_PORT}`);
  });
  server.on("error", (e) => {
    if (e.code !== "EADDRINUSE") console.error("[ingest] server error:", e.message);
  });
  return server;
}
function resolveProviderSlug(model) {
  const m = model.toLowerCase();
  if (m.includes("claude")) return "anthropic";
  if (m.includes("gpt") || m.includes("o1") || m.includes("o3") || m.includes("o4")) return "openai";
  if (m.includes("gemini")) return "google";
  if (m.includes("mistral") || m.includes("mixtral") || m.includes("devstral")) return "mistral";
  if (m.includes("llama") || m.includes("qwen") || m.includes("deepseek")) return "groq";
  if (m.includes("command")) return "cohere";
  return "anthropic";
}
const PRICING = {
  "claude-opus-4": [15, 75],
  "claude-sonnet-4": [3, 15],
  "claude-haiku-4": [0.8, 4],
  "claude-opus-4-5": [15, 75],
  "claude-sonnet-4-6": [3, 15],
  "claude-haiku-4-5": [0.8, 4],
  "claude-3-5-sonnet": [3, 15],
  "claude-3-5-haiku": [0.8, 4],
  "claude-3-opus": [15, 75],
  "gpt-4o": [2.5, 10],
  "gpt-4o-mini": [0.15, 0.6],
  "gpt-4-turbo": [10, 30],
  "o1": [15, 60],
  "o3": [10, 40],
  "gemini-2.0-flash": [0.1, 0.4],
  "gemini-1.5-pro": [1.25, 5]
};
function estimateCost(model, input, output) {
  const key = Object.keys(PRICING).find((k) => model.toLowerCase().includes(k));
  if (!key) return 0;
  const [inPrice, outPrice] = PRICING[key];
  return input / 1e6 * inPrice + output / 1e6 * outPrice;
}
function createWindow() {
  const win = new electron.BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false,
    backgroundColor: "#0f172a"
  });
  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
  win.once("ready-to-show", () => win.show());
  return win;
}
electron.app.whenReady().then(() => {
  mainWindow = createWindow();
  startIngestServer();
  startTranscriptWatcher(() => mainWindow);
  startDevinWatcher(() => mainWindow);
  initializeResetScheduler(mainWindow);
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
      initializeResetScheduler(mainWindow);
    }
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") electron.app.quit();
});
electron.ipcMain.handle("db:getProviders", () => getProviders());
electron.ipcMain.handle("db:addProvider", (_e, data) => addProvider(data));
electron.ipcMain.handle("db:updateProvider", (_e, id, data) => updateProvider(id, data));
electron.ipcMain.handle("db:deleteProvider", (_e, id) => deleteProvider(id));
electron.ipcMain.handle("db:getUsageRecords", (_e, filters) => getUsageRecords(filters));
electron.ipcMain.handle("db:addUsageRecord", (_e, data) => addUsageRecord(data));
electron.ipcMain.handle("db:deleteUsageRecord", (_e, id) => deleteUsageRecord(id));
electron.ipcMain.handle("db:getProviderStats", () => getProviderStats());
electron.ipcMain.handle("db:getDailyUsage", (_e, days) => getDailyUsage(days));
electron.ipcMain.handle("db:getSettings", () => getSettings());
electron.ipcMain.handle("db:updateSettings", (_e, settings) => updateSettings(settings));
electron.ipcMain.handle("db:getResetConfigs", (_e, providerId) => getResetConfigs(providerId));
electron.ipcMain.handle("db:addResetConfig", (_e, data) => addResetConfig(data));
electron.ipcMain.handle("db:updateResetConfig", (_e, id, data) => updateResetConfig(id, data));
electron.ipcMain.handle("db:deleteResetConfig", (_e, id) => deleteResetConfig(id));
electron.ipcMain.handle("db:getResetHistory", (_e, providerId, limit) => getResetHistory(providerId, limit));
electron.ipcMain.handle("db:performReset", async (_e, providerId, configId) => {
  try {
    return await performReset(providerId, configId);
  } catch (error) {
    throw new Error(error.message);
  }
});
electron.ipcMain.handle("db:getTimezones", () => getTimezones());
electron.ipcMain.handle("db:getProviderStatsWithReset", () => getProviderStatsWithReset());
electron.ipcMain.handle("reset:getStatus", () => {
  const scheduler = getResetScheduler();
  return scheduler ? scheduler.getStatus() : { isRunning: false };
});
electron.ipcMain.handle("reset:triggerCheck", async () => {
  const scheduler = getResetScheduler();
  if (scheduler) {
    await scheduler.triggerManualCheck();
    return { success: true };
  }
  return { success: false, error: "Scheduler not running" };
});
electron.ipcMain.handle("reset:getNextScheduled", () => {
  const scheduler = getResetScheduler();
  return scheduler ? scheduler.getNextScheduledResets() : [];
});
electron.ipcMain.handle("app:openFile", async () => {
  const result = await electron.dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "CSV", extensions: ["csv"] }]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return fs.readFileSync(result.filePaths[0], "utf-8");
});
electron.ipcMain.handle("app:saveFile", async (_e, content, filename) => {
  const result = await electron.dialog.showSaveDialog({
    defaultPath: filename,
    filters: [{ name: "CSV", extensions: ["csv"] }]
  });
  if (result.canceled || !result.filePath) return false;
  fs.writeFileSync(result.filePath, content, "utf-8");
  return true;
});
electron.ipcMain.handle("app:openExternal", (_e, url) => {
  electron.shell.openExternal(url);
});
let configLogs = [];
function checkPort(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(3e3);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}
function checkProcessRunning(processName) {
  return new Promise((resolve) => {
    const command = process.platform === "win32" ? `tasklist | findstr "${processName}"` : `ps aux | grep "${processName}" | grep -v grep`;
    child_process.exec(command, (error) => {
      resolve(!error);
    });
  });
}
function checkFileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}
function addLog(type, message, details) {
  configLogs.unshift({
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    type,
    message,
    details
  });
  if (configLogs.length > 100) configLogs = configLogs.slice(0, 100);
}
electron.ipcMain.handle("config:getStatus", async () => {
  var _a;
  const status = {
    hooks: { configured: false },
    providers: { configured: false, count: 0 },
    scripts: { configured: false, scripts: [] },
    monitoring: { active: false, lastCheck: "", port: INGEST_PORT, endpoint: `http://127.0.0.1:${INGEST_PORT}` }
  };
  try {
    const currentTimestamp = (/* @__PURE__ */ new Date()).toISOString();
    const homeDir = require("os").homedir();
    const claudeSettingsPath = path.join(homeDir, ".claude", "settings.json");
    if (fs.existsSync(claudeSettingsPath)) {
      try {
        const claudeSettings = JSON.parse(fs.readFileSync(claudeSettingsPath, "utf-8"));
        const stopHooks = (_a = claudeSettings == null ? void 0 : claudeSettings.hooks) == null ? void 0 : _a.Stop;
        const hasOurHook = Array.isArray(stopHooks) && stopHooks.some(
          (h) => Array.isArray(h.hooks) && h.hooks.some(
            (hh) => typeof hh.command === "string" && hh.command.includes("claude-code-hook.js")
          )
        );
        if (hasOurHook) {
          status.hooks.configured = true;
          status.hooks.path = claudeSettingsPath;
          status.hooks.online = true;
          status.hooks.lastPing = currentTimestamp;
        }
      } catch {
      }
    }
    const providers = getProviders();
    status.providers.configured = providers.length > 0;
    status.providers.count = providers.length;
    status.providers.online = providers.length > 0;
    status.providers.lastPing = currentTimestamp;
    const scriptsDir = path.join(__dirname, "../scripts");
    if (fs.existsSync(scriptsDir)) {
      const scripts = fs.readdirSync(scriptsDir).filter((f) => f.endsWith(".js"));
      status.scripts.configured = scripts.length > 0;
      status.scripts.scripts = scripts;
      status.scripts.online = scripts.length > 0;
      status.scripts.lastPing = currentTimestamp;
    }
    status.monitoring.active = true;
    status.monitoring.lastCheck = currentTimestamp;
    try {
      const portAccessible = await checkPort(INGEST_PORT);
      status.monitoring.online = portAccessible;
      status.monitoring.lastPing = portAccessible ? currentTimestamp : void 0;
    } catch (error) {
      status.monitoring.online = false;
      addLog("warning", "Porta do servidor de ingestão não acessível", `Porta ${INGEST_PORT}`);
    }
    try {
      const nodeRunning = await checkProcessRunning("node");
      if (!nodeRunning) {
        addLog("warning", "Nenhum processo Node.js ativo detectado", "Isso pode afetar o monitoramento");
      }
    } catch (error) {
      addLog("error", "Erro ao verificar processos Node.js", String(error));
    }
  } catch (error) {
    addLog("error", "Erro ao verificar status da configuração", String(error));
  }
  return status;
});
electron.ipcMain.handle("config:forceHooks", async () => {
  var _a, _b, _c, _d, _e, _f;
  try {
    addLog("info", "Configurando hook Stop no Claude Code...");
    const homeDir = require("os").homedir();
    const claudeDir = path.join(homeDir, ".claude");
    const claudeSettingsPath = path.join(claudeDir, "settings.json");
    const hookScriptPath = path.join(electron.app.getAppPath(), "hook", "claude-code-hook.js");
    if (!fs.existsSync(claudeDir)) fs.mkdirSync(claudeDir, { recursive: true });
    let settings = {};
    if (fs.existsSync(claudeSettingsPath)) {
      try {
        settings = JSON.parse(fs.readFileSync(claudeSettingsPath, "utf-8"));
      } catch {
        settings = {};
      }
    }
    if (!settings.hooks) settings.hooks = {};
    settings.hooks.Stop = [
      { hooks: [{ type: "command", command: `node "${hookScriptPath}"` }] }
    ];
    fs.writeFileSync(claudeSettingsPath, JSON.stringify(settings, null, 2), "utf-8");
    const written = JSON.parse(fs.readFileSync(claudeSettingsPath, "utf-8"));
    const verified = ((_f = (_e = (_d = (_c = (_b = (_a = written == null ? void 0 : written.hooks) == null ? void 0 : _a.Stop) == null ? void 0 : _b[0]) == null ? void 0 : _c.hooks) == null ? void 0 : _d[0]) == null ? void 0 : _e.command) == null ? void 0 : _f.includes("claude-code-hook.js")) === true;
    if (verified) {
      addLog("success", "Hook Stop configurado com sucesso", `Arquivo: ${claudeSettingsPath}`);
      return { success: true, file: claudeSettingsPath, verified: true };
    } else {
      addLog("error", "Falha na verificação do hook", "Hook não encontrado após escrita");
      return { success: false, error: "Falha na verificação do hook" };
    }
  } catch (error) {
    addLog("error", "Falha ao configurar hook", String(error));
    return { success: false, error: String(error) };
  }
});
electron.ipcMain.handle("config:forceProviders", async () => {
  try {
    addLog("info", "Verificando providers...");
    const providers = getProviders();
    if (providers.length === 0) {
      addLog("warning", "Nenhum provider encontrado", "Reinicie o app para recriar os providers padrão");
      return { success: false, error: "Nenhum provider encontrado. Reinicie o aplicativo para recriar os providers padrão." };
    }
    const dbPath2 = path.join(electron.app.getPath("userData"), "quoteiamanager.json");
    addLog("success", "Providers verificados", `${providers.length} providers em ${dbPath2}`);
    return { success: true, count: providers.length, verified: true };
  } catch (error) {
    addLog("error", "Falha ao verificar providers", String(error));
    return { success: false, error: String(error) };
  }
});
electron.ipcMain.handle("config:forceScripts", async () => {
  try {
    addLog("info", "Configurando scripts de monitoramento...");
    const scriptsDir = path.join(__dirname, "../scripts");
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true });
      addLog("info", "Diretório de scripts criado", `Caminho: ${scriptsDir}`);
    }
    const essentialScripts = {
      "track-usage.js": fs.readFileSync(path.join(__dirname, "../scripts/track-usage.js"), "utf-8"),
      "session-start.js": fs.readFileSync(path.join(__dirname, "../scripts/session-start.js"), "utf-8"),
      "monitor-api-usage.js": fs.readFileSync(path.join(__dirname, "../scripts/monitor-api-usage.js"), "utf-8")
    };
    let successCount = 0;
    for (const [scriptName, content] of Object.entries(essentialScripts)) {
      try {
        const scriptPath = path.join(scriptsDir, scriptName);
        fs.writeFileSync(scriptPath, content, "utf-8");
        if (process.platform !== "win32") {
          fs.chmodSync(scriptPath, "755");
        }
        if (fs.existsSync(scriptPath) && fs.readFileSync(scriptPath, "utf-8").length > 0) {
          successCount++;
          addLog("info", `Script configurado: ${scriptName}`, `Caminho: ${scriptPath}`);
        } else {
          addLog("error", `Falha ao verificar script: ${scriptName}`, "Arquivo não encontrado ou vazio");
        }
      } catch (error) {
        addLog("error", `Falha ao configurar script: ${scriptName}`, String(error));
      }
    }
    if (successCount === Object.keys(essentialScripts).length) {
      addLog("success", "Todos os scripts configurados com sucesso", `Scripts: ${Object.keys(essentialScripts).join(", ")}`);
      return { success: true, scripts: Object.keys(essentialScripts), verified: true };
    } else {
      addLog("warning", "Scripts configurados com avisos", `${successCount}/${Object.keys(essentialScripts).length} scripts bem-sucedidos`);
      return { success: true, scripts: Object.keys(essentialScripts), verified: false, successCount };
    }
  } catch (error) {
    addLog("error", "Falha ao configurar scripts", String(error));
    return { success: false, error: String(error) };
  }
});
electron.ipcMain.handle("config:validateAll", async () => {
  var _a;
  try {
    addLog("info", "Iniciando validação completa da configuração...");
    const results = {
      hooks: { valid: false, details: "", online: false },
      providers: { valid: false, details: "", online: false },
      scripts: { valid: false, details: "", online: false },
      database: { valid: false, details: "", online: false },
      network: { valid: false, details: "", online: false }
    };
    const homeDir = require("os").homedir();
    const claudeSettingsPath = path.join(homeDir, ".claude", "settings.json");
    let hookConfigured = false;
    if (fs.existsSync(claudeSettingsPath)) {
      try {
        const claudeSettings = JSON.parse(fs.readFileSync(claudeSettingsPath, "utf-8"));
        const stopHooks = (_a = claudeSettings == null ? void 0 : claudeSettings.hooks) == null ? void 0 : _a.Stop;
        hookConfigured = Array.isArray(stopHooks) && stopHooks.some(
          (h) => Array.isArray(h.hooks) && h.hooks.some(
            (hh) => typeof hh.command === "string" && hh.command.includes("claude-code-hook.js")
          )
        );
      } catch {
      }
    }
    if (hookConfigured) {
      results.hooks.valid = true;
      results.hooks.details = `Hook Stop configurado em: ${claudeSettingsPath}`;
      results.hooks.online = true;
    } else {
      results.hooks.details = "Hook Stop não configurado em ~/.claude/settings.json";
      results.hooks.online = false;
    }
    const providers = getProviders();
    if (providers.length > 0) {
      results.providers.valid = true;
      results.providers.details = `${providers.length} providers configurados`;
      results.providers.online = true;
    } else {
      results.providers.details = "Nenhum provider encontrado";
      results.providers.online = false;
    }
    const scriptsDir = path.join(__dirname, "../scripts");
    if (fs.existsSync(scriptsDir)) {
      const scripts = fs.readdirSync(scriptsDir).filter((f) => f.endsWith(".js"));
      if (scripts.length >= 3) {
        results.scripts.valid = true;
        results.scripts.details = `${scripts.length} scripts encontrados`;
        results.scripts.online = true;
      } else {
        results.scripts.details = `Apenas ${scripts.length} scripts encontrados (mínimo: 3)`;
        results.scripts.online = false;
      }
    } else {
      results.scripts.details = "Diretório de scripts não encontrado";
      results.scripts.online = false;
    }
    const dbPath2 = path.join(electron.app.getPath("userData"), "quoteiamanager.json");
    if (fs.existsSync(dbPath2)) {
      try {
        const dbContent = JSON.parse(fs.readFileSync(dbPath2, "utf-8"));
        if (dbContent.providers && dbContent.usage && dbContent.settings) {
          results.database.valid = true;
          results.database.details = `Banco de dados válido com ${dbContent.providers.length} providers`;
          results.database.online = true;
        } else {
          results.database.details = "Banco de dados com estrutura inválida";
          results.database.online = false;
        }
      } catch (e) {
        results.database.details = "Banco de dados corrompido ou inválido";
        results.database.online = false;
      }
    } else {
      results.database.details = "Banco de dados não encontrado";
      results.database.online = false;
    }
    try {
      const portAccessible = await checkPort(INGEST_PORT);
      if (portAccessible) {
        results.network.valid = true;
        results.network.details = `Servidor de ingestão acessível na porta ${INGEST_PORT}`;
        results.network.online = true;
      } else {
        results.network.details = `Servidor de ingestão não acessível na porta ${INGEST_PORT}`;
        results.network.online = false;
      }
    } catch (error) {
      results.network.details = `Erro ao testar conectividade: ${String(error)}`;
      results.network.online = false;
    }
    const allValid = Object.values(results).every((r) => r.valid);
    const allOnline = Object.values(results).every((r) => r.online);
    addLog(
      allValid && allOnline ? "success" : "warning",
      "Validação concluída",
      `Status: ${allValid && allOnline ? "Configuração completa e online" : allValid ? "Configuração válida mas com problemas de conectividade" : "Configuração incompleta"}`
    );
    return { ...results, allValid, allOnline };
  } catch (error) {
    addLog("error", "Falha na validação", String(error));
    throw error;
  }
});
electron.ipcMain.handle("config:getLogs", () => {
  return configLogs;
});
electron.ipcMain.handle("config:testConnectivity", async () => {
  try {
    addLog("info", "Iniciando testes de conectividade...");
    const tests = {
      portIngest: await checkPort(INGEST_PORT),
      port3000: await checkPort(3e3),
      // Common API port
      port8000: await checkPort(8e3),
      // Alternative API port
      nodeProcess: await checkProcessRunning("node"),
      electronProcess: await checkProcessRunning("electron"),
      dbAccessible: checkFileExists(path.join(electron.app.getPath("userData"), "quoteiamanager.json")),
      scriptsAccessible: checkFileExists(path.join(__dirname, "../scripts"))
    };
    const successCount = Object.values(tests).filter(Boolean).length;
    const totalTests = Object.keys(tests).length;
    addLog(
      "info",
      "Testes de conectividade concluídos",
      `${successCount}/${totalTests} testes bem-sucedidos`
    );
    return { success: true, tests, successCount, totalTests };
  } catch (error) {
    addLog("error", "Falha nos testes de conectividade", String(error));
    return { success: false, error: String(error) };
  }
});
electron.ipcMain.handle("config:refreshStatus", async () => {
  var _a;
  try {
    addLog("info", "Atualizando status da configuração...");
    const status = {
      hooks: { configured: false },
      providers: { configured: false, count: 0 },
      scripts: { configured: false, scripts: [] },
      monitoring: { active: false, lastCheck: "", port: INGEST_PORT, endpoint: `http://127.0.0.1:${INGEST_PORT}` }
    };
    const currentTimestamp = (/* @__PURE__ */ new Date()).toISOString();
    const homeDir = require("os").homedir();
    const claudeSettingsPath = path.join(homeDir, ".claude", "settings.json");
    if (fs.existsSync(claudeSettingsPath)) {
      try {
        const claudeSettings = JSON.parse(fs.readFileSync(claudeSettingsPath, "utf-8"));
        const stopHooks = (_a = claudeSettings == null ? void 0 : claudeSettings.hooks) == null ? void 0 : _a.Stop;
        const hasOurHook = Array.isArray(stopHooks) && stopHooks.some(
          (h) => Array.isArray(h.hooks) && h.hooks.some(
            (hh) => typeof hh.command === "string" && hh.command.includes("claude-code-hook.js")
          )
        );
        if (hasOurHook) {
          status.hooks.configured = true;
          status.hooks.path = claudeSettingsPath;
          status.hooks.online = true;
          status.hooks.lastPing = currentTimestamp;
        }
      } catch {
      }
    }
    const providers = getProviders();
    status.providers.configured = providers.length > 0;
    status.providers.count = providers.length;
    status.providers.online = providers.length > 0;
    status.providers.lastPing = currentTimestamp;
    const scriptsDir = path.join(__dirname, "../scripts");
    if (fs.existsSync(scriptsDir)) {
      const scripts = fs.readdirSync(scriptsDir).filter((f) => f.endsWith(".js"));
      status.scripts.configured = scripts.length > 0;
      status.scripts.scripts = scripts;
      status.scripts.online = scripts.length > 0;
      status.scripts.lastPing = currentTimestamp;
    }
    status.monitoring.active = true;
    status.monitoring.lastCheck = currentTimestamp;
    try {
      const portAccessible = await checkPort(INGEST_PORT);
      status.monitoring.online = portAccessible;
      status.monitoring.lastPing = portAccessible ? currentTimestamp : void 0;
    } catch (error) {
      status.monitoring.online = false;
    }
    return { success: true, status };
  } catch (error) {
    addLog("error", "Falha ao atualizar status", String(error));
    return { success: false, error: String(error) };
  }
});
electron.ipcMain.handle("app:getIngestPort", () => INGEST_PORT);
electron.ipcMain.handle("app:getHookScriptPath", () => {
  return path.join(electron.app.getAppPath(), "hook", "claude-code-hook.js");
});
electron.ipcMain.handle("app:syncTranscripts", () => syncAllTranscripts());
electron.ipcMain.handle("app:syncDevin", () => syncDevinSessions());
electron.ipcMain.handle("app:getClaudeProjectsDir", () => {
  const candidates = [
    path.join(require("os").homedir(), ".claude", "projects"),
    process.env.APPDATA ? path.join(process.env.APPDATA, "Claude", "projects") : ""
  ].filter((p) => Boolean(p));
  return candidates.find((p) => {
    try {
      return fs.statSync(p).isDirectory();
    } catch {
      return false;
    }
  }) ?? null;
});
