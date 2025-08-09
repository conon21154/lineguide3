// API 설정 및 유틸리티

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

console.log('🔧 API 설정:', {
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  API_BASE_URL,
  LOGIN_URL: `${API_BASE_URL}/auth/login`
});

export const API_ENDPOINTS = {
  // 인증
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    ME: `${API_BASE_URL}/auth/me`,
    REFRESH: `${API_BASE_URL}/auth/refresh`,
    CHANGE_PASSWORD: `${API_BASE_URL}/auth/change-password`,
    LOGOUT: `${API_BASE_URL}/auth/logout`
  },
  
  // 작업지시
  WORK_ORDERS: {
    LIST: `${API_BASE_URL}/work-orders`,
    CREATE: `${API_BASE_URL}/work-orders`,
    BULK_UPLOAD: `${API_BASE_URL}/work-orders/bulk-upload`,
    CLEAR_ALL: `${API_BASE_URL}/work-orders/clear-all`,
    DETAIL: (id: string) => `${API_BASE_URL}/work-orders/${id}`,
    UPDATE_STATUS: (id: string) => `${API_BASE_URL}/work-orders/${id}/status`,
    DELETE: (id: string) => `${API_BASE_URL}/work-orders/${id}`,
    RESPONSE_NOTES: (id: string) => `${API_BASE_URL}/work-orders/${id}/response-notes`
  },
  
  // 팀
  TEAMS: {
    LIST: `${API_BASE_URL}/teams`,
    STATS: (team: string) => `${API_BASE_URL}/teams/${team}/stats`,
    USERS: (team: string) => `${API_BASE_URL}/teams/${team}/users`,
    ADMIN_OVERVIEW: `${API_BASE_URL}/teams/admin/overview`
  }
};

// 인증 토큰 관리
export const AuthToken = {
  get(): string | null {
    return localStorage.getItem('auth_token');
  },
  
  set(token: string): void {
    localStorage.setItem('auth_token', token);
  },
  
  remove(): void {
    localStorage.removeItem('auth_token');
  },
  
  getAuthHeaders(): Record<string, string> {
    const token = this.get();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
};

// 기본 fetch 래퍼
export const apiRequest = async <T = any>(
  url: string, 
  options: RequestInit = {}
): Promise<T> => {
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...AuthToken.getAuthHeaders(),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    // 401 에러 시 토큰 제거하고 로그인 페이지로
    if (response.status === 401) {
      AuthToken.remove();
      window.location.href = '/login';
    }
    
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

// GET 요청
export const apiGet = async <T = any>(url: string): Promise<T> => {
  return apiRequest<T>(url, { method: 'GET' });
};

// POST 요청
export const apiPost = async <T = any>(url: string, data?: any): Promise<T> => {
  return apiRequest<T>(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
};

// PUT 요청
export const apiPut = async <T = any>(url: string, data?: any): Promise<T> => {
  return apiRequest<T>(url, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
};

// DELETE 요청
export const apiDelete = async <T = any>(url: string): Promise<T> => {
  return apiRequest<T>(url, { method: 'DELETE' });
};

// 파일 업로드
export const apiUpload = async <T = any>(url: string, file: File): Promise<T> => {
  const formData = new FormData();
  formData.append('file', file); // 백엔드와 필드명 일치시킴

  return apiRequest<T>(url, {
    method: 'POST',
    headers: {
      // Content-Type을 설정하지 않음 (FormData가 자동으로 설정)
      ...AuthToken.getAuthHeaders(),
    },
    body: formData,
  });
};