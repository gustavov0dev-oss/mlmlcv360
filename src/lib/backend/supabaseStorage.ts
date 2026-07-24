import { StorageInterface, FileUploadResult, FileMetadata, DeleteResult, UploadOptions } from './types';
import { supabase } from './client';

export const supabaseStorageService: StorageInterface = {
  async upload(bucket, path, file, options: UploadOptions = {}): Promise<FileUploadResult> {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: options.upsert ?? false,
      ...(options.contentType ? { contentType: options.contentType } : {}),
      ...(options.cacheControl ? { cacheControl: options.cacheControl } : {}),
      ...(options.metadata ? { metadata: options.metadata } : {}),
    });
    if (error) {
      return { success: false, error: error.message };
    }
    const url = supabase.storage.from(bucket).getPublicUrl(data.path).data.publicUrl;
    return { success: true, url, path: data.path };
  },

  async download(bucket, path): Promise<Blob | null> {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error || !data) {
      return null;
    }
    return data;
  },

  getPublicUrl(bucket, path): string {
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  },

  async list(bucket, path = ''): Promise<FileMetadata[]> {
    const { data, error } = await supabase.storage.from(bucket).list(path);
    if (error || !data) {
      return [];
    }
    return data.map((item) => ({
      name: item.name,
      size: item.metadata?.size ?? 0,
      contentType: item.metadata?.mimetype ?? 'application/octet-stream',
      url: supabase.storage.from(bucket).getPublicUrl(path ? `${path}/${item.name}` : item.name).data.publicUrl,
      createdAt: item.created_at,
    }));
  },

  async remove(bucket, paths): Promise<DeleteResult> {
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  async exists(bucket, path): Promise<boolean> {
    const { data, error } = await supabase.storage.from(bucket).list(path.split('/').slice(0, -1).join('/'), {
      search: path.split('/').pop(),
    });
    if (error || !data) {
      return false;
    }
    return data.length > 0;
  },
};
