import {
  DatabaseInterface,
  QueryOptions,
  QueryResult,
  InsertResult,
  UpdateResult,
  DeleteResult,
  Filter,
  FilterCondition,
  OrderClause,
  DeleteOptions,
  UpdateOptions,
  SubscribeOptions,
} from './types';
import { supabase } from './client';

// The Supabase query builder uses a complex fluent generic chain that is impractical
// to type precisely in a wrapper. We use `any` internally and cast results to the
// strongly-typed public interfaces defined in types.ts.

function applyFilter(query: any, filter: Filter): any {
  if (!filter) return query;

  if (typeof filter === 'string') {
    return query.or(filter);
  }

  if (Array.isArray(filter)) {
    for (const cond of filter) {
      const { column, operator, value } = cond as FilterCondition;
      if (value === null && (operator === 'eq' || operator === 'is')) {
        query = query.is(column, null);
      } else if (Array.isArray(value) && operator === 'in') {
        query = query.in(column, value);
      } else {
        query = query[operator](column, value);
      }
    }
    return query;
  }

  for (const [key, value] of Object.entries(filter)) {
    if (Array.isArray(value)) {
      query = query.in(key, value);
    } else if (value === null) {
      query = query.is(key, null);
    } else {
      query = query.eq(key, value);
    }
  }
  return query;
}

function applyOrder(query: any, order: OrderClause | OrderClause[]): any {
  const orders = Array.isArray(order) ? order : [order];
  for (const o of orders) {
    query = query.order(o.column, {
      ascending: o.ascending ?? true,
      ...(o.nullsFirst !== undefined ? { nullsFirst: o.nullsFirst } : {}),
    });
  }
  return query;
}

export const supabaseDatabaseService: DatabaseInterface = {
  async select<T>(table: string, options: QueryOptions = {}): Promise<QueryResult<T>> {
    let query = supabase.from(table).select(
      Array.isArray(options.select) ? options.select.join(',') : (options.select || '*'),
      options.count ? { count: options.count } : undefined,
    );

    if (options.filter) {
      query = applyFilter(query, options.filter);
    }

    if (options.order) {
      query = applyOrder(query, options.order);
    }

    if (options.range) {
      query = query.range(options.range.from, options.range.to);
    } else if (options.limit && options.offset) {
      query = query.range(options.offset, options.offset + options.limit - 1);
    } else if (options.limit) {
      query = query.limit(options.limit);
    } else if (options.offset) {
      query = query.range(options.offset, options.offset + 9);
    }

    if (options.head) {
      const { count, error } = await query;
      return { data: null, error: error?.message, count: count ?? undefined };
    }

    if (options.single) {
      const { data, error } = await query.single();
      return { data: data as T | null, error: error?.message };
    }

    if (options.maybeSingle) {
      const { data, error } = await query.maybeSingle();
      return { data: data as T | null, error: error?.message };
    }

    const { data, error, count } = await query;
    return { data: data as T[], error: error?.message, count: count ?? undefined };
  },

  async insert<T>(table: string, data: Partial<T> | Partial<T>[]): Promise<InsertResult<T>> {
    const { data: result, error } = await supabase.from(table).insert(data as any).select().single();
    if (error) {
      return { error: error.message };
    }
    return { data: result as T };
  },

  async update<T>(table: string, id: string | Filter, data: Partial<T>, options: UpdateOptions = {}): Promise<UpdateResult<T>> {
    let query: any = supabase.from(table).update(data as any);

    if (typeof id === 'string') {
      query = query.eq('id', id);
    } else {
      query = applyFilter(query, id);
    }

    if (options.filter) {
      query = applyFilter(query, options.filter);
    }

    query = options.select ? query.select(options.select) : query.select();

    const { data: result, error } = await query.single();
    if (error) {
      return { error: error.message };
    }
    return { data: result as T };
  },

  async delete(table: string, id: string, options: DeleteOptions = {}): Promise<DeleteResult> {
    let query = supabase.from(table).delete().eq('id', id);
    if (options.filter) {
      query = applyFilter(query, options.filter);
    }
    const { error } = await query;
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  async deleteWhere(table: string, filter: Filter): Promise<DeleteResult> {
    let query = supabase.from(table).delete();
    query = applyFilter(query, filter);
    const { error } = await query;
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  async upsert<T>(table: string, data: Partial<T> | Partial<T>[], conflictKey = 'id'): Promise<InsertResult<T>> {
    const { data: result, error } = await supabase
      .from(table)
      .upsert(data as any, { onConflict: conflictKey })
      .select()
      .single();
    if (error) {
      return { error: error.message };
    }
    return { data: result as T };
  },

  async rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<QueryResult<T>> {
    const { data, error } = await supabase.rpc(fn, args);
    return { data: data as T, error: error?.message };
  },

  subscribe(table: string, callback: (payload: unknown) => void, options: SubscribeOptions = {}): () => void {
    const channelName = options.filter
      ? `${table}-changes-${options.filter}`
      : `${table}-changes`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event: options.event || '*',
          schema: options.schema || 'public',
          table,
          ...(options.filter ? { filter: options.filter } : {}),
        },
        callback as any,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  },

  async invoke<T>(name: string, options: { body?: unknown; headers?: Record<string, string> } = {}): Promise<{ data: T | null; error?: string }> {
    const { data, error } = await supabase.functions.invoke(name, {
      body: options.body as any,
      ...(options.headers ? { headers: options.headers } : {}),
    });
    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as T };
  },
};
