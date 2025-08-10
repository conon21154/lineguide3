import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, API_ENDPOINTS } from '@/config/api';

// 베이스 정보 타입
export interface MemoBaseInfo {
  workOrderId: number;
  status: 'pending' | 'in_progress' | 'completed' | string;
  side: 'DU측' | 'RU측';
  operationTeam: string;
  managementNumber: string;
  duName: string | null;
  ruName: string | null;
  coSiteCount5g: number | null;
}

// 메모 저장 요청 타입
export interface SaveMemoRequest {
  workOrderId: number;
  content: string;
  side: 'DU측' | 'RU측';
}

// 메모 저장 응답 타입
export interface SaveMemoResponse {
  message: string;
  responseNote: {
    id: number;
    workOrderId: number;
    side: string;
    content: string;
    createdAt: string;
    updatedAt: string;
  };
}

// 에러 응답 타입
export interface ErrorResponse {
  error: string;
  existing?: {
    id: number;
    content: string;
    createdAt: string;
  };
}

// 베이스 정보 조회 훅
export function useMemoBase(workOrderId: number | string) {
  return useQuery({
    queryKey: ['memoBase', workOrderId],
    queryFn: async (): Promise<MemoBaseInfo> => {
      try {
        const response = await apiGet<MemoBaseInfo>(`${API_ENDPOINTS.WORK_ORDERS.MEMO_BASE(workOrderId.toString())}`);
        return response;
      } catch (error) {
        console.error('베이스 정보 조회 오류:', error);
        // 개발환경에서 인증 오류 시 더 자세한 정보 제공
        if (error instanceof Error && error.message.includes('인증')) {
          throw new Error('인증이 필요합니다. 로그인 후 다시 시도해주세요.');
        }
        throw error;
      }
    },
    enabled: !!workOrderId,
    staleTime: 10 * 1000, // 10초
    retry: (failureCount, error) => {
      // 인증 오류는 재시도하지 않음
      if (error instanceof Error && error.message.includes('인증')) {
        return false;
      }
      return failureCount < 2;
    },
    refetchOnWindowFocus: false
  });
}

// 메모 저장 훅
export function useSaveMemo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SaveMemoRequest): Promise<SaveMemoResponse> => {
      const response = await apiPost<SaveMemoResponse>(API_ENDPOINTS.RESPONSE_NOTES.CREATE, data);
      return response;
    },
    onSuccess: (data, variables) => {
      // 성공 시 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['memoBase', variables.workOrderId] });
      queryClient.invalidateQueries({ queryKey: ['responseNotes'] });
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
      // 대시보드 현장 회신 데이터 즉시 반영
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'field-replies'] });
    },
    onError: (error: any) => {
      console.error('메모 저장 실패:', error);
    }
  });
}

// 커스텀 훅: 메모 작성 전체 로직
export function useMemoForm(workOrderId: number | string) {
  const baseQuery = useMemoBase(workOrderId);
  const saveMutation = useSaveMemo();

  return {
    // 베이스 정보
    baseInfo: baseQuery.data,
    isLoading: baseQuery.isLoading,
    error: baseQuery.error,
    
    // 저장 관련
    saveMemo: saveMutation.mutate,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error,
    saveSuccess: saveMutation.isSuccess,
    
    // 편의 속성
    isCompleted: baseQuery.data?.status === 'completed' || baseQuery.data?.status === '확인완료',
    canSave: (baseQuery.data?.status === 'completed' || baseQuery.data?.status === '확인완료') && !saveMutation.isPending,
    
    // 리셋 함수
    resetSaveState: () => saveMutation.reset()
  };
}