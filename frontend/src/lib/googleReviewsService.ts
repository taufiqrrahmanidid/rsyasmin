export interface GoogleReviewItem {
  id: string;
  authorName: string;
  authorPhoto?: string;
  rating: number;
  dateStr: string;
  relativeTime: string;
  comment: string;
  isVisible: boolean;
  source: string;
}

const API_BASE = import.meta.env.VITE_BACKEND_URL + '/api';

export async function syncGoogleReviewsFromMaps(): Promise<{ total: number }> {
  const res = await fetch(`${API_BASE}/sync-google`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal sinkronisasi Google Maps');
  return { total: data.total || 0 };
}

export async function fetchAllGoogleReviewsForAdmin(): Promise<GoogleReviewItem[]> {
  try {
    const res = await fetch(`${API_BASE}/reviews`);
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    return [];
  }
}

export async function fetchPublishedGoogleReviews(): Promise<GoogleReviewItem[]> {
  try {
    const res = await fetch(`${API_BASE}/reviews?publishedOnly=true`);
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    return [];
  }
}

export async function toggleReviewVisibility(id: string, currentVisible: boolean): Promise<boolean> {
  const res = await fetch(`${API_BASE}/reviews/${id}/toggle`, { method: 'PATCH' });
  const data = await res.json();
  return data.isVisible;
}

export async function clearAllGoogleReviews(): Promise<void> {
  await fetch(`${API_BASE}/reviews`, { method: 'DELETE' });
}