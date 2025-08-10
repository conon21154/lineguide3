import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch, API_ENDPOINTS } from '@/config/api';

// 대시보드 현장 회신 응답 타입
export interface DashboardFieldRepliesResponse {
  success: boolean;
  data: {
    totals: {
      all: number;
      unconfirmed: number;
      confirmed: number;
      last24h: number;
    };
    recent: Array<{
      id: string;
      workOrderId: string;
      side: string;
      ruId?: string;
      content: string;
      confirmedAt?: string;
      createdAt: string;
      createdBy: number;
    }>;
  };
}

// 대시보드 현장 회신 데이터 조회 훅
export function useDashboardFieldReplies() {
  return useQuery({
    queryKey: ['dashboard', 'field-replies'],
    queryFn: async (): Promise<DashboardFieldRepliesResponse> => {
      const response = await apiGet<DashboardFieldRepliesResponse>(
        API_ENDPOINTS.DASHBOARD.FIELD_REPLIES
      );
      return response;
    },
    staleTime: 0, // 항상 최신 데이터 요청
    refetchInterval: 30000, // 30초마다 자동 새로고침
    refetchOnWindowFocus: true, // 윈도우 포커스 시 새로고침
    refetchOnMount: true, // 마운트 시 새로고침
    retry: 2,
    retryDelay: 1000
  });
}

// 현장 회신 확인 상태 토글 훅
export function useToggleFieldReplyConfirm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, confirmed }: { id: string; confirmed: boolean }) => {
      const response = await apiPatch(API_ENDPOINTS.DASHBOARD.FIELD_REPLY_CONFIRM(id), {
        confirmed
      });
      return response;
    },
    onSuccess: () => {
      // 성공 시 대시보드 현장 회신 데이터 즉시 반영
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'field-replies'] });
    },
    onError: (error) => {
      console.error('현장 회신 확인 상태 토글 실패:', error);
    }
  });
}