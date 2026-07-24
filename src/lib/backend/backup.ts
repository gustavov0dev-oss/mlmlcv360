import { BackendServices, ExportData, FileMetadata } from './types';

const EXPORT_TABLES = [
  'profiles',
  'plans',
  'ranks',
  'products',
  'categories',
  'orders',
  'order_items',
  'commissions',
  'transactions',
  'subscriptions',
  'payment_gateways',
  'system_config',
  'coupons',
  'product_reviews',
  'shipping_zones',
  'coupons',
  'affiliate_links',
  'network_mlm',
];

const STORAGE_BUCKETS = ['avatars', 'products', 'documents'];

export async function exportDatabase(database: BackendServices['database']): Promise<Record<string, unknown[]>> {
  const tables: Record<string, unknown[]> = {};
  const errors: string[] = [];

  for (const table of EXPORT_TABLES) {
    const result = await database.select(table, { order: { column: 'created_at', ascending: false } });
    if (result.error) {
      errors.push(`Failed to export ${table}: ${result.error}`);
    }
    tables[table] = (result.data as unknown[]) || [];
  }

  if (errors.length > 0) {
    console.warn('Export warnings:', errors);
  }

  return tables;
}

export async function exportStorage(storage: BackendServices['storage']): Promise<Record<string, FileMetadata[]>> {
  const buckets: Record<string, FileMetadata[]> = {};

  for (const bucket of STORAGE_BUCKETS) {
    try {
      const files = await storage.list(bucket);
      buckets[bucket] = files;
    } catch (err) {
      console.warn(`Failed to export storage bucket ${bucket}:`, err);
      buckets[bucket] = [];
    }
  }

  return buckets;
}

export async function exportAuth(auth: BackendServices['auth']): Promise<ExportData['auth']> {
  const user = await auth.getUser();
  return {
    users: user
      ? [
          {
            id: user.id,
            email: user.email,
            emailConfirmed: user.emailConfirmed,
            createdAt: user.createdAt,
          },
        ]
      : [],
  };
}

export async function createFullExport(backend: BackendServices): Promise<ExportData> {
  const [tables, storage, authData] = await Promise.all([
    exportDatabase(backend.database),
    exportStorage(backend.storage),
    exportAuth(backend.auth),
  ]);

  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    tables,
    storage,
    auth: authData,
  };
}

export function exportToJson(data: ExportData): string {
  return JSON.stringify(data, null, 2);
}

export function downloadExport(data: ExportData, filename = 'mlm360-backup.json'): void {
  const json = exportToJson(data);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportToSql(tables: Record<string, unknown[]>): Promise<string> {
  let sql = '-- MLM 360 Database Export\n';
  sql += `-- Generated: ${new Date().toISOString()}\n\n`;

  for (const [table, rows] of Object.entries(tables)) {
    if (!rows || rows.length === 0) continue;

    sql += `\n-- Table: ${table}\n`;

    for (const row of rows) {
      const record = row as Record<string, unknown>;
      const columns = Object.keys(record);
      const values = columns.map((col) => {
        const val = record[col];
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'number') return val.toString();
        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
        if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
        return `'${String(val).replace(/'/g, "''")}'`;
      });

      sql += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
    }
  }

  return sql;
}

export function formatDateForFilename(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export async function createBackup(backend: BackendServices): Promise<{ json: ExportData; sql: string }> {
  const json = await createFullExport(backend);
  const sql = await exportToSql(json.tables);
  return { json, sql };
}

export function downloadBackup(backend: BackendServices): void {
  createBackup(backend).then(({ json, sql }) => {
    const dateStr = formatDateForFilename();
    downloadExport(json, `mlm360-backup-${dateStr}.json`);

    const blob = new Blob([sql], { type: 'application/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mlm360-backup-${dateStr}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}
