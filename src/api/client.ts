const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private token: string | null = null;
  private onUnauthorized?: () => void;

  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getToken() {
    return this.token;
  }

  setOnUnauthorized(callback: () => void) {
    this.onUnauthorized = callback;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // Handle 401 Unauthorized - token expired or invalid
      if (response.status === 401) {
        this.setToken(null);
        if (this.onUnauthorized) {
          this.onUnauthorized();
        }
      }

      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // Auth
  async register(username: string, password: string) {
    return this.request<{ token: string; user: { id: string; username: string } }>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify({ username, password }) }
    );
  }

  async login(username: string, password: string) {
    return this.request<{ token: string; user: { id: string; username: string } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ username, password }) }
    );
  }

  async getMe() {
    return this.request<{ user: { id: string; username: string } }>('/auth/me');
  }

  // Checklists
  async getChecklists() {
    return this.request<any[]>('/checklists');
  }

  async createChecklist(data: { title: string; x: number; y: number; color?: string }) {
    return this.request<any>('/checklists', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateChecklist(id: string, data: { title?: string; x?: number; y?: number; color?: string }) {
    return this.request<any>(`/checklists/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteChecklist(id: string) {
    return this.request<void>(`/checklists/${id}`, { method: 'DELETE' });
  }

  async addItem(checklistId: string, data: { text?: string; afterItemId?: string }) {
    return this.request<any>(`/checklists/${checklistId}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateItem(checklistId: string, itemId: string, data: { text?: string; completed?: boolean }) {
    return this.request<any>(`/checklists/${checklistId}/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteItem(checklistId: string, itemId: string) {
    return this.request<void>(`/checklists/${checklistId}/items/${itemId}`, {
      method: 'DELETE',
    });
  }

  async reorderItems(checklistId: string, itemIds: string[]) {
    return this.request<any>(`/checklists/${checklistId}/reorder`, {
      method: 'POST',
      body: JSON.stringify({ itemIds }),
    });
  }

  async reorderChecklists(checklistIds: string[]) {
    return this.request<any>('/checklists/reorder-checklists', {
      method: 'POST',
      body: JSON.stringify({ checklistIds }),
    });
  }

  async moveItemBetweenChecklists(
    sourceChecklistId: string,
    targetChecklistId: string,
    itemId: string,
    targetIndex: number
  ) {
    return this.request<any>('/checklists/move-item', {
      method: 'POST',
      body: JSON.stringify({ sourceChecklistId, targetChecklistId, itemId, targetIndex }),
    });
  }

  async selectAll(checklistId: string) {
    return this.request<any>(`/checklists/${checklistId}/select-all`, { method: 'POST' });
  }

  async deselectAll(checklistId: string) {
    return this.request<any>(`/checklists/${checklistId}/deselect-all`, { method: 'POST' });
  }

  async deleteCompleted(checklistId: string) {
    return this.request<any>(`/checklists/${checklistId}/completed`, { method: 'DELETE' });
  }

  // Text Notes
  async getTextNotes() {
    return this.request<any[]>('/textnotes');
  }

  async createTextNote(data: { text: string; x: number; y: number; fontSize?: number; color?: string }) {
    return this.request<any>('/textnotes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTextNote(id: string, data: { text?: string; x?: number; y?: number; fontSize?: number; color?: string }) {
    return this.request<any>(`/textnotes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteTextNote(id: string) {
    return this.request<void>(`/textnotes/${id}`, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
