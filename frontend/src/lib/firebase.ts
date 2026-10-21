const API_BASE = import.meta.env.VITE_BACKEND_URL + '/api';

// 1. PENGGANTI FETCH COLLECTION FIRESTORE
export async function fetchCollection(colName: string): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/${colName}`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error(`Gagal memuat [${colName}] dari server PostgreSQL:`, error);
    return [];
  }
}

// 2. PENGGANTI BATCH SYNC FIRESTORE
export async function syncCollectionToCloud(colName: string, localItems: any[]) {
  try {
    const res = await fetch(`${API_BASE}/sync/${colName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: localItems }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    console.log(`[POSTGRES] Berhasil menyimpan sinkronisasi [${colName}] ke database lokal.`);
  } catch (error) {
    console.error(`Gagal sinkronisasi [${colName}] ke PostgreSQL:`, error);
  }
}

// 3. PENGGANTI SAVE DOCUMENT FIRESTORE
export async function saveDocument(colName: string, docId: string, data: any) {
  try {
    await fetch(`${API_BASE}/save/${colName}/${docId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    console.log(`[POSTGRES] Dokumen [${colName}/${docId}] berhasil disimpan.`);
  } catch (error) {
    console.error(`Gagal menyimpan [${colName}/${docId}] ke PostgreSQL:`, error);
  }
}

export async function deleteDocument(colName: string, docId: string) {
  // Opsional delete handler
  console.log(`[DELETE] Hapus ${colName}/${docId}`);
}

// 4. SHIM KOMPATIBILITAS (Agar kode lama tidak error jika memanggil db/doc)
export const db = { type: 'postgresql' } as any;
export const auth = {} as any;
export function doc(dbInstance: any, col: string, id: string) {
  return { col, id };
}

export async function getDoc(docRef: any) {
  try {
    const res = await fetch(`${API_BASE}/${docRef.col}`);
    const data = await res.json();
    return {
      exists: () => !!data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0),
      data: () => data
    };
  } catch (e) {
    return { exists: () => false, data: () => ({}) };
  }
}

// Auth handlers mandiri (Forwarding ke localStorage)
export async function logoutAdminPendaftaran(): Promise<void> {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
}

export function watchAdminAuthState(callback: (user: any) => void) {
  const token = localStorage.getItem('admin_token');
  const user = localStorage.getItem('admin_user');
  if (token && user) {
    callback(JSON.parse(user));
  } else {
    callback(null);
  }
  return () => {};
}