import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
}

interface PaginationParams {
  page?: number;
  limit?: number;
}

interface Item {
  id: number;
  name: string;
  description: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

interface CreateItemPayload {
  name: string;
  description: string;
  status: string;
}

interface UpdateItemPayload {
  name?: string;
  description?: string;
  status?: string;
}

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;
  private tenantId: string;

  constructor(baseURL: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api') {
    this.baseURL = baseURL;
    this.tenantId = this.getTenantId();

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': this.tenantId,
      },
    });

    this.setupInterceptors();
  }

  private getTenantId(): string {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tenantId') || 'default_tenant';
    }
    return 'default_tenant';
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use((config) => {
      const token = this.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      config.headers['X-Tenant-ID'] = this.tenantId;
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          const refreshToken = this.getRefreshToken();

          if (refreshToken) {
            try {
              const response = await axios.post(`${this.baseURL}/auth/refresh`, {
                refreshToken,
              });

              const { accessToken } = response.data.data;
              this.setAccessToken(accessToken);

              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              }

              return this.client(originalRequest);
            } catch (refreshError) {
              this.clearTokens();
              if (typeof window !== 'undefined') {
                window.location.href = '/login';
              }
              return Promise.reject(refreshError);
            }
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  }

  private getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refreshToken');
    }
    return null;
  }

  private setAccessToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', token);
    }
  }

  private clearTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('tenantId');
    }
  }

  async setTenant(tenantId: string): Promise<void> {
    this.tenantId = tenantId;
    if (typeof window !== 'undefined') {
      localStorage.setItem('tenantId', tenantId);
    }
    this.client.defaults.headers['X-Tenant-ID'] = tenantId;
  }

  // Items CRUD Operations
  async getAllItems(params?: PaginationParams): Promise<ApiResponse<Item[]>> {
    try {
      const response = await this.client.get<ApiResponse<Item[]>>('/items', {
        params: {
          page: params?.page || 1,
          limit: params?.limit || 20,
        },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getItemById(id: number): Promise<ApiResponse<Item>> {
    try {
      const response = await this.client.get<ApiResponse<Item>>(`/items/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createItem(payload: CreateItemPayload): Promise<ApiResponse<Item>> {
    try {
      const response = await this.client.post<ApiResponse<Item>>('/items', payload);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateItem(id: number, payload: UpdateItemPayload): Promise<ApiResponse<Item>> {
    try {
      const response = await this.client.put<ApiResponse<Item>>(`/items/${id}`, payload);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteItem(id: number): Promise<ApiResponse<{ id: number }>> {
    try {
      const response = await this.client.delete<ApiResponse<{ id: number }>>(`/items/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Dashboard Analytics
  async getDashboardStats(): Promise<
    ApiResponse<{
      totalItems: number;
      activeItems: number;
      inactiveItems: number;
      recentActivity: unknown[];
    }>
  > {
    try {
      const response = await this.client.get<
        ApiResponse<{
          totalItems: number;
          activeItems: number;
          inactiveItems: number;
          recentActivity: unknown[];
        }>
      >('/dashboard/stats');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getAnalytics(params?: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<
    ApiResponse<{
      labels: string[];
      datasets: Array<{
        label: string;
        data: number[];
        backgroundColor: string;
      }>;
    }>
  > {
    try {
      const response = await this.client.get<
        ApiResponse<{
          labels: string[];
          datasets: Array<{
            label: string;
            data: number[];
            backgroundColor: string;
          }>;
        }>
      >('/analytics', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Auth Operations
  async login(email: string, password: string): Promise<
    ApiResponse<{
      accessToken: string;
      refreshToken: string;
      user: {
        id: string;
        email: string;
        name: string;
        role: string;
      };
    }>
  > {
    try {
      const response = await this.client.post<
        ApiResponse<{
          accessToken: string;
          refreshToken: string;
          user: {
            id: string;
            email: string;
            name: string;
            role: string;
          };
        }>
      >('/auth/login', { email, password });

      if (response.data.data) {
        this.setAccessToken(response.data.data.accessToken);
        if (typeof window !== 'undefined') {
          localStorage.setItem('refreshToken', response.data.data.refreshToken);
        }
      }

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async logout(): Promise<ApiResponse<null>> {
    try {
      const response = await this.client.post<ApiResponse<null>>('/auth/logout');
      this.clearTokens();
      return response.data;
    } catch (error) {
      this.clearTokens();
      throw this.handleError(error);
    }
  }

  async refreshAccessToken(): Promise<ApiResponse<{ accessToken: string }>> {
    try {
      const refreshToken = this.getRefreshToken();
      const response = await this.client.post<ApiResponse<{ accessToken: string }>>(
        '/auth/refresh',
        { refreshToken }
      );

      if (response.data.data) {
        this.setAccessToken(response.data.data.accessToken);
      }

      return response.data;
    } catch (error) {
      this.clearTokens();
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        'Terjadi kesalahan pada server';

      const code = error.response?.data?.error?.code || 'UNKNOWN_ERROR';

      return new Error(`[${code}] ${message}`);
    }

    return error instanceof Error ? error : new Error('Terjadi kesalahan yang tidak diketahui');
  }
}

export const apiClient = new ApiClient();

export type { ApiResponse, Item, CreateItemPayload, UpdateItemPayload, PaginationParams };