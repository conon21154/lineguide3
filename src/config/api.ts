// API 설정 및 유틸리티

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.MODE === 'production' 
    ? 'https://lineguide3-backend.onrender.com/api' 
    : 'http://192.168.1.118:5000/api');

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
    DETAIL: (id: string) => `${API_BASE_URL}/work-orders/${id}`,
    UPDATE_STATUS: (id: string) => `${API_BASE_URL}/work-orders/${id}/status`,
    DELETE: (id: string) => `${API_BASE_URL}/work-orders/${id}`,
    RESPONSE_NOTE: (id: string) => `${API_BASE_URL}/work-orders/${id}/response-note`,
    FIELD_REPORTS: `${API_BASE_URL}/work-orders/field-reports`,
    MEMO_BASE: (id: string) => `${API_BASE_URL}/work-orders/${id}/memo-base`,
    LABEL_DATA: (id: string) => `${API_BASE_URL}/work-orders/${id}/label-data`
  },
  
  // 팀
  TEAMS: {
    LIST: `${API_BASE_URL}/teams`,
    STATS: (team: string) => `${API_BASE_URL}/teams/${team}/stats`,
    USERS: (team: string) => `${API_BASE_URL}/teams/${team}/users`,
    ADMIN_OVERVIEW: `${API_BASE_URL}/teams/admin/overview`
  },

  // 회신 메모
  RESPONSE_NOTES: {
    LIST: `${API_BASE_URL}/response-notes`,
    CREATE: `${API_BASE_URL}/response-notes`,
    CHECK_DUPLICATE: `${API_BASE_URL}/response-notes/check-duplicate`,
    LATEST: `${API_BASE_URL}/response-notes/latest`,
    UPDATE: (id: string) => `${API_BASE_URL}/response-notes/${id}`,
    CLEAR: (id: string) => `${API_BASE_URL}/response-notes/${id}/clear`,
    DELETE: (id: string) => `${API_BASE_URL}/response-notes/${id}`
  },

  // 대시보드
  DASHBOARD: {
    FIELD_REPLIES: `${API_BASE_URL}/dashboard/field-replies`,
    FIELD_REPLY_CONFIRM: (id: string) => `${API_BASE_URL}/dashboard/field-replies/${id}/confirm`
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
export const apiRequest = async <T = unknown>(
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
    let errorData: { error?: string } = {};
    
    try {
      // Content-Type이 JSON인지 확인
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json();
      }
    } catch (jsonError) {
      console.warn('Failed to parse error response as JSON:', jsonError);
    }
    
    // 401 에러 시 토큰 제거하고 로그인 페이지로
    if (response.status === 401) {
      AuthToken.remove();
      window.location.href = '/login';
      return Promise.reject(new Error('인증이 필요합니다'));
    }
    
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  // 응답이 JSON인지 확인 후 파싱
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  } else {
    // JSON이 아닌 응답 (예: HTML)
    const text = await response.text();
    console.warn('Non-JSON response received:', text.substring(0, 100));
    throw new Error('서버에서 예상하지 못한 응답을 받았습니다');
  }
};

// GET 요청
export const apiGet = async <T = unknown>(url: string): Promise<T> => {
  return apiRequest<T>(url, { method: 'GET' });
};

// POST 요청
export const apiPost = async <T = unknown>(url: string, data?: unknown): Promise<T> => {
  return apiRequest<T>(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
};

// PUT 요청
export const apiPut = async <T = unknown>(url: string, data?: unknown): Promise<T> => {
  return apiRequest<T>(url, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
};

// PATCH 요청
export const apiPatch = async <T = unknown>(url: string, data?: unknown): Promise<T> => {
  return apiRequest<T>(url, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
};

// DELETE 요청
export const apiDelete = async <T = unknown>(url: string): Promise<T> => {
  return apiRequest<T>(url, { method: 'DELETE' });
};

// 파일 업로드
export const apiUpload = async <T = unknown>(url: string, file: File): Promise<T> => {
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