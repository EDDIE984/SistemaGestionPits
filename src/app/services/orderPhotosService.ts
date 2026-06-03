import { supabase } from '@/app/lib/supabase';
import type { OrderPhotoAttachment, SessionUser } from '@/app/types';

const ORDER_PHOTOS_BUCKET = 'orden-fotos';

function getSession(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem('pits_session_user');
  return raw ? (JSON.parse(raw) as SessionUser) : null;
}

function safeFileName(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
  const baseName = fileName
    .replace(/\.[^/.]+$/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return `${baseName || 'foto'}.${extension}`;
}

function parseDescription(description?: string | null) {
  if (!description) return { etapa: 'GENERAL', nombre: 'Foto de orden', storage_path: '', pieza: '', pieza_key: '', pieza_dano_id: '' };

  try {
    const parsed = JSON.parse(description) as Partial<OrderPhotoAttachment>;
    return {
      etapa: parsed.etapa ?? 'GENERAL',
      nombre: parsed.nombre ?? 'Foto de orden',
      storage_path: parsed.storage_path ?? '',
      pieza: parsed.pieza ?? '',
      pieza_key: parsed.pieza_key ?? '',
      pieza_dano_id: parsed.pieza_dano_id ?? '',
    };
  } catch {
    return { etapa: 'GENERAL', nombre: description, storage_path: '', pieza: '', pieza_key: '', pieza_dano_id: '' };
  }
}

function pathFromPublicUrl(url: string) {
  const marker = `/storage/v1/object/public/${ORDER_PHOTOS_BUCKET}/`;
  const index = url.indexOf(marker);
  return index >= 0 ? decodeURIComponent(url.slice(index + marker.length)) : '';
}

export async function fetchOrderPhotos(orderId: string): Promise<OrderPhotoAttachment[]> {
  const { data, error } = await supabase
    .from('adjuntos')
    .select('id, url, descripcion, created_at')
    .eq('tabla_referencia', 'ordenes')
    .eq('referencia_id', orderId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const item = row as { id: string; url: string; descripcion: string | null; created_at: string };
    const metadata = parseDescription(item.descripcion);
    return {
      id: item.id,
      url: item.url,
      storage_path: metadata.storage_path || pathFromPublicUrl(item.url),
      etapa: metadata.etapa as OrderPhotoAttachment['etapa'],
      nombre: metadata.nombre,
      pieza: metadata.pieza,
      pieza_key: metadata.pieza_key,
      pieza_dano_id: metadata.pieza_dano_id,
      created_at: item.created_at,
    };
  });
}

export async function uploadOrderPhotos(
  orderId: string,
  files: File[],
  etapa: OrderPhotoAttachment['etapa'],
  context?: { pieza?: string; pieza_key?: string; pieza_dano_id?: string },
): Promise<OrderPhotoAttachment[]> {
  const session = getSession();
  if (!session) throw new Error('Sesion no encontrada');

  const uploaded: OrderPhotoAttachment[] = [];

  for (const file of files) {
    const storagePath = `${orderId}/${etapa.toLowerCase()}/${Date.now()}-${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage
      .from(ORDER_PHOTOS_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrl } = supabase.storage.from(ORDER_PHOTOS_BUCKET).getPublicUrl(storagePath);
    const metadata = {
      etapa,
      nombre: file.name,
      storage_path: storagePath,
      pieza: context?.pieza?.trim() || undefined,
      pieza_key: context?.pieza_key?.trim() || undefined,
      pieza_dano_id: context?.pieza_dano_id?.trim() || undefined,
    };

    const { data, error } = await supabase
      .from('adjuntos')
      .insert({
        usuario_id: session.id,
        tabla_referencia: 'ordenes',
        referencia_id: orderId,
        url: publicUrl.publicUrl,
        descripcion: JSON.stringify(metadata),
      })
      .select('id, created_at')
      .single();

    if (error) {
      await supabase.storage.from(ORDER_PHOTOS_BUCKET).remove([storagePath]);
      throw error;
    }

    uploaded.push({
      id: (data as { id: string }).id,
      url: publicUrl.publicUrl,
      storage_path: storagePath,
      etapa,
      nombre: file.name,
      pieza: metadata.pieza,
      pieza_key: metadata.pieza_key,
      pieza_dano_id: metadata.pieza_dano_id,
      created_at: (data as { created_at: string }).created_at,
    });
  }

  return uploaded;
}

export async function deleteOrderPhoto(photo: Pick<OrderPhotoAttachment, 'id' | 'storage_path' | 'url'>): Promise<void> {
  const storagePath = photo.storage_path || pathFromPublicUrl(photo.url);

  if (storagePath) {
    const { error: storageError } = await supabase.storage.from(ORDER_PHOTOS_BUCKET).remove([storagePath]);
    if (storageError) throw storageError;
  }

  const { error } = await supabase.from('adjuntos').delete().eq('id', photo.id);
  if (error) throw error;
}

export async function deleteOrderPhotos(orderId: string): Promise<void> {
  const photos = await fetchOrderPhotos(orderId);
  const storagePaths = photos.map((photo) => photo.storage_path || pathFromPublicUrl(photo.url)).filter(Boolean);

  if (storagePaths.length > 0) {
    const { error: storageError } = await supabase.storage.from(ORDER_PHOTOS_BUCKET).remove(storagePaths);
    if (storageError) throw storageError;
  }

  const { error } = await supabase
    .from('adjuntos')
    .delete()
    .eq('tabla_referencia', 'ordenes')
    .eq('referencia_id', orderId);

  if (error) throw error;
}
