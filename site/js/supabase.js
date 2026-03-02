// ============================================
// BRO_CODEC — Supabase Client
// ============================================

const SUPABASE_URL = 'https://mrroshcdicgjlpxfnlog.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ycm9zaGNkaWNnamxweGZubG9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODk5NTMsImV4cCI6MjA4ODA2NTk1M30.temStQ5TmxfY8o6EA7dDYPXC8VD_Hkf2FW2L7Pu22YI';

// Lightweight Supabase client (no SDK needed)
const supabase = {
  _headers(auth = false) {
    const h = {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    };
    if (auth) {
      const token = localStorage.getItem('sb_access_token');
      if (token) h['Authorization'] = `Bearer ${token}`;
    }
    return h;
  },

  // === AUTH ===
  async signIn(email, password) {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await resp.json();
    if (data.error) throw new Error(data.error_description || data.msg || data.error);
    localStorage.setItem('sb_access_token', data.access_token);
    localStorage.setItem('sb_refresh_token', data.refresh_token);
    localStorage.setItem('sb_user', JSON.stringify(data.user));
    return data;
  },

  async signOut() {
    const token = localStorage.getItem('sb_access_token');
    if (token) {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem('sb_access_token');
    localStorage.removeItem('sb_refresh_token');
    localStorage.removeItem('sb_user');
  },

  getUser() {
    const raw = localStorage.getItem('sb_user');
    return raw ? JSON.parse(raw) : null;
  },

  isLoggedIn() {
    return !!localStorage.getItem('sb_access_token');
  },

  async refreshSession() {
    const refresh = localStorage.getItem('sb_refresh_token');
    if (!refresh) return false;
    try {
      const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      localStorage.setItem('sb_access_token', data.access_token);
      localStorage.setItem('sb_refresh_token', data.refresh_token);
      return true;
    } catch {
      this.signOut();
      return false;
    }
  },

  // === DATABASE ===
  async query(table, { select = '*', filter = '', order = '', limit = 100, auth = false } = {}) {
    let url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
    if (filter) url += `&${filter}`;
    if (order) url += `&order=${order}`;
    if (limit) url += `&limit=${limit}`;
    const resp = await fetch(url, { headers: this._headers(auth) });
    if (!resp.ok) { const e = await resp.json(); throw new Error(e.message || 'Query failed'); }
    return resp.json();
  },

  async insert(table, data) {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: { ...this._headers(true), 'Prefer': 'return=representation' },
      body: JSON.stringify(data),
    });
    if (!resp.ok) { const e = await resp.json(); throw new Error(e.message || 'Insert failed'); }
    return resp.json();
  },

  async update(table, id, data) {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: 'PATCH',
      headers: { ...this._headers(true), 'Prefer': 'return=representation' },
      body: JSON.stringify(data),
    });
    if (!resp.ok) { const e = await resp.json(); throw new Error(e.message || 'Update failed'); }
    return resp.json();
  },

  async delete(table, id) {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: 'DELETE',
      headers: this._headers(true),
    });
    if (!resp.ok) { const e = await resp.json(); throw new Error(e.message || 'Delete failed'); }
    return true;
  },

  // === RPC (for increment_download_count) ===
  async rpc(fn, params = {}) {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { ...this._headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!resp.ok) { const e = await resp.json(); throw new Error(e.message || 'RPC failed'); }
    return true;
  },

  // === STORAGE ===
  async uploadFile(bucket, path, file) {
    const token = localStorage.getItem('sb_access_token');
    const resp = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
      },
      body: file,
    });
    if (!resp.ok) {
      // Try upsert if file exists
      const resp2 = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
        method: 'PUT',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
        },
        body: file,
      });
      if (!resp2.ok) { const e = await resp2.json(); throw new Error(e.message || 'Upload failed'); }
    }
    return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
  },

  async deleteFile(bucket, path) {
    const token = localStorage.getItem('sb_access_token');
    const resp = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
      },
    });
    return resp.ok;
  },

  getPublicUrl(bucket, path) {
    return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
  },
};
