import { supabase } from "./supabase";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8787";

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
    return {};
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const authHeaders = await this.getAuthHeaders();

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        await supabase.auth.signOut();
        window.location.href = "/signin";
        throw new Error("Session expired. Redirecting to sign in.");
      }

      let detail = response.statusText;
      try {
        const body = await response.json();
        if (body.detail) detail = body.detail;
      } catch {
        // response body wasn't JSON
      }
      throw new Error(`${response.status}: ${detail}`);
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete(endpoint: string): Promise<void> {
    const url = `${this.baseUrl}${endpoint}`;
    const authHeaders = await this.getAuthHeaders();
    const response = await fetch(url, {
      method: "DELETE",
      headers: { ...authHeaders },
    });
    if (!response.ok) {
      if (response.status === 401) {
        await supabase.auth.signOut();
        window.location.href = "/signin";
        throw new Error("Session expired. Redirecting to sign in.");
      }

      let detail = response.statusText;
      try {
        const body = await response.json();
        if (body.detail) detail = body.detail;
      } catch {
        // response body wasn't JSON
      }
      throw new Error(`${response.status}: ${detail}`);
    }
  }
}

export const api = new ApiClient();
