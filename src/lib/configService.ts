import { useState, useEffect } from 'react';
import { supabaseBackend } from '@/lib/backend';

export type ConfigCategory = 'general' | 'email' | 'auth' | 'currency' | 'tax' | 'store' | 'network' | 'registration' | 'permissions' | 'whatsapp' | 'ai';

export interface ConfigItem {
  key: string;
  value: string | null;
  description: string | null;
  category: ConfigCategory;
  is_sensitive: boolean;
}

const SENSITIVE_KEYS = new Set([
  'smtp_password',
  'smtp_pass',
  'smtp_user',
  'google_client_secret',
  'fixer_api_key',
  'ai_api_key',
  'api_key',
  'secret_key',
  'private_key',
  'access_token',
  'webhook_secret',
  'service_role_key',
]);

const cache = new Map<string, string>();
let lastFetch = 0;
const CACHE_TTL = 60_000;

async function getConfigMap(): Promise<Map<string, ConfigItem>> {
  const now = Date.now();
  if (now - lastFetch < CACHE_TTL && cache.size > 0) {
    const result = new Map<string, ConfigItem>();
    cache.forEach((value, key) => {
      result.set(key, { key, value, description: null, category: 'general', is_sensitive: SENSITIVE_KEYS.has(key) });
    });
    return result;
  }

  const result = await supabaseBackend.database.select<ConfigItem>('system_config', {
    select: ['key', 'value', 'description', 'category', 'is_sensitive'],
  });

  if (result.error) {
    console.error('configService: Error fetching config', result.error);
    return new Map();
  }

  const map = new Map<string, ConfigItem>();
  (result.data as ConfigItem[] || []).forEach((row: ConfigItem) => {
    if (row.key) {
      map.set(row.key, row as ConfigItem);
      if (row.value !== null) {
        cache.set(row.key, row.value);
      }
    }
  });

  lastFetch = now;
  return map;
}

export const configService = {
  async get(key: string): Promise<string | null> {
    if (SENSITIVE_KEYS.has(key)) {
      console.warn(`configService: Attempt to read sensitive key "${key}" from client - returning null`);
      return null;
    }
    const map = await getConfigMap();
    return map.get(key)?.value ?? null;
  },

  async getBoolean(key: string, defaultValue = false): Promise<boolean> {
    const value = await this.get(key);
    if (value === null) return defaultValue;
    return value === 'true';
  },

  async getNumber(key: string, defaultValue = 0): Promise<number> {
    const value = await this.get(key);
    if (value === null) return defaultValue;
    const num = parseFloat(value);
    return isNaN(num) ? defaultValue : num;
  },

  async set(key: string, value: string): Promise<boolean> {
    if (SENSITIVE_KEYS.has(key)) {
      console.warn(`configService: Cannot set sensitive key "${key}" from client - use admin panel or edge function`);
      return false;
    }

    const result = await supabaseBackend.database.upsert('system_config',
      { key, value, category: 'general', updated_at: new Date().toISOString() },
      'key'
    );

    if (result.error) {
      console.error('configService: Error setting config', result.error);
      return false;
    }

    cache.set(key, value);
    return true;
  },

  async getAll(): Promise<ConfigItem[]> {
    const map = await getConfigMap();
    return Array.from(map.values()).filter((item) => !item.is_sensitive);
  },

  async getByCategory(category: ConfigCategory): Promise<ConfigItem[]> {
    const map = await getConfigMap();
    return Array.from(map.values()).filter((item) => item.category === category && !item.is_sensitive);
  },

  async refresh(): Promise<void> {
    lastFetch = 0;
    cache.clear();
    await getConfigMap();
  },

  isSensitive(key: string): boolean {
    return SENSITIVE_KEYS.has(key);
  },

  getSensitiveKeys(): string[] {
    return Array.from(SENSITIVE_KEYS);
  },
};

export function useConfigValue(key: string, defaultValue: string = ''): [string | null, boolean] {
  const [value, setValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getConfigMap().then(map => {
      setValue(map.get(key)?.value ?? defaultValue);
      setLoading(false);
    });
  }, [key, defaultValue]);

  return [value, loading];
}
