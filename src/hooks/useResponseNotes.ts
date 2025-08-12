import { useState, useEffect, useCallback } from 'react';
import { ResponseNoteData } from '@/types';
import { API_ENDPOINTS, apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/config/api';

export interface UseResponseNotesResult {
  responseNotes: ResponseNoteData[];
  loading: boolean;
  error: string | null;
  // CRUD 함수들
  createResponseNote: (data: {
    workOrderId: string;
    side: 'DU' | 'RU';
    ruId?: string;
    content: string;
  }) => Promise<{ success: boolean; data?: ResponseNoteData; error?: string }>;
  updateResponseNote: (id: string, content: string) => Promise<{ success: boolean; error?: string }>;
  clearResponseNote: (id: string) => Promise<{ success: boolean; error?: string }>;
  deleteResponseNote: (id: string) => Promise<{ success: boolean; error?: string }>;
  checkDuplicate: (workOrderId: string, side: 'DU' | 'RU', ruId?: string) => Promise<{
    exists: boolean;
    existing?: { id: string; content: string; createdAt: string };
  }>;
  refreshData: () => Promise<void>;
}

export function useResponseNotes(): UseResponseNotesResult {
  const [responseNotes, setResponseNotes] = useState<ResponseNoteData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 회신 메모 목록 조회
  const fetchResponseNotes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await apiGet<ResponseNoteData[]>(API_ENDPOINTS.RESPONSE_NOTES.LIST);
      
      // API 응답 상태 확인 (개발 환경에서만)
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ ResponseNotes API: ${data?.length || 0}개 데이터 로드`);
      }
      
      setResponseNotes(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '회신 메모 조회 중 오류가 발생했습니다.';
      setError(errorMessage);
      console.error('❌ 회신 메모 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 초기 데이터 로드
  useEffect(() => {
    fetchResponseNotes();
  }, [fetchResponseNotes]);

  // 중복 확인
  const checkDuplicate = useCallback(async (
    workOrderId: string, 
    side: 'DU' | 'RU', 
    ruId?: string
  ) => {
    try {
      const params = new URLSearchParams({
        workOrderId,
        side,
        ...(ruId && { ruId })
      });
      
      const response = await apiGet<{
        exists: boolean;
        existing?: { id: string; content: string; createdAt: string };
      }>(`${API_ENDPOINTS.RESPONSE_NOTES.CHECK_DUPLICATE}?${params}`);
      
      return response;
    } catch (err) {
      console.error('❌ 중복 확인 오류:', err);
      return { exists: false };
    }
  }, []);

  // 회신 메모 생성
  const createResponseNote = async (data: {
    workOrderId: string;
    side: 'DU' | 'RU';
    ruId?: string;
    content: string;
  }) => {
    try {
      setLoading(true);
      
      const response = await apiPost<{ responseNote: ResponseNoteData }>(
        API_ENDPOINTS.RESPONSE_NOTES.CREATE,
        data
      );
      
      // 목록 새로고침
      await refreshData();
      
      return { success: true, data: response.responseNote };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '회신 메모 등록 중 오류가 발생했습니다.';
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // 회신 메모 수정
  const updateResponseNote = async (id: string, content: string) => {
    try {
      setLoading(true);
      
      await apiPut(API_ENDPOINTS.RESPONSE_NOTES.UPDATE(id), { content });
      
      // 목록 새로고침
      await refreshData();
      
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '회신 메모 수정 중 오류가 발생했습니다.';
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // 회신 메모 비우기
  const clearResponseNote = async (id: string) => {
    try {
      setLoading(true);
      
      await apiPatch(API_ENDPOINTS.RESPONSE_NOTES.CLEAR(id));
      
      // 목록 새로고침
      await refreshData();
      
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '회신 메모 비우기 중 오류가 발생했습니다.';
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // 회신 메모 삭제
  const deleteResponseNote = async (id: string) => {
    try {
      setLoading(true);
      
      await apiDelete(API_ENDPOINTS.RESPONSE_NOTES.DELETE(id));
      
      // 목록 새로고침
      await refreshData();
      
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '회신 메모 삭제 중 오류가 발생했습니다.';
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // 데이터 새로고침
  const refreshData = async () => {
    await fetchResponseNotes();
  };

  return {
    responseNotes,
    loading,
    error,
    createResponseNote,
    updateResponseNote,
    clearResponseNote,
    deleteResponseNote,
    checkDuplicate,
    refreshData
  };
}