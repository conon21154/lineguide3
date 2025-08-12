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
      console.log('📡 서버에서 현장회신 데이터 새로 조회 시작');
      const response = await apiGet<DashboardFieldRepliesResponse>(
        API_ENDPOINTS.DASHBOARD.FIELD_REPLIES
      );
      
      // 서버에서 받은 데이터 확인 (첫 3개만 샘플)
      if (response?.data?.recent && response.data.recent.length > 0) {
        console.log('📡 서버 조회 완료 - 최신 데이터 샘플:', 
          response.data.recent.slice(0, 3).map(item => ({
            id: item.id,
            confirmedAt: item.confirmedAt,
            isConfirmed: !!item.confirmedAt
          }))
        );
      }
      
      return response;
    },
    staleTime: 5000, // 5초 동안은 fresh 상태 유지 (빈번한 재조회 방지)
    refetchInterval: 30000, // 30초마다 자동 새로고침
    refetchOnWindowFocus: true, // 윈도우 포커스 시 새로고침
    refetchOnMount: true, // 마운트 시 새로고침
    retry: 2,
    retryDelay: 1000,
    // optimistic update 중에는 백그라운드 재조회 방지
    refetchIntervalInBackground: false
  });
}

// 현장 회신 확인 상태 토글 훅
export function useToggleFieldReplyConfirm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, confirmed }: { id: string; confirmed: boolean }) => {
      console.log('🔄 현장회신 확인 상태 변경 API 호출:', { id, confirmed });
      const response = await apiPatch(API_ENDPOINTS.DASHBOARD.FIELD_REPLY_CONFIRM(id), {
        confirmed
      });
      console.log('✅ API 응답:', response);
      return response;
    },
    // Optimistic update for immediate UI feedback
    onMutate: async ({ id, confirmed }) => {
      console.log('⚡ Optimistic update 시작:', { id, confirmed });
      
      // 진행 중인 쿼리 취소하여 optimistic update를 덮어쓰지 않도록
      await queryClient.cancelQueries({ queryKey: ['dashboard', 'field-replies'] });

      // 현재 캐시 데이터 백업
      const previousData = queryClient.getQueryData(['dashboard', 'field-replies']) as DashboardFieldRepliesResponse | undefined;

      // Optimistic update: 캐시 데이터 즉시 수정
      if (previousData) {
        const now = new Date().toISOString();
        console.log('📝 Optimistic update 데이터 변경:', { 
          itemId: id, 
          confirmed, 
          newConfirmedAt: confirmed ? now : null 
        });
        
        const updatedData: DashboardFieldRepliesResponse = {
          ...previousData,
          data: {
            ...previousData.data,
            totals: {
              ...previousData.data.totals,
              unconfirmed: confirmed 
                ? Math.max(0, previousData.data.totals.unconfirmed - 1)
                : previousData.data.totals.unconfirmed + 1,
              confirmed: confirmed
                ? previousData.data.totals.confirmed + 1  
                : Math.max(0, previousData.data.totals.confirmed - 1)
            },
            recent: previousData.data.recent.map(item => {
              if (item.id === id) {
                const updatedItem = { 
                  ...item, 
                  confirmedAt: confirmed ? now : null 
                };
                console.log('🔄 아이템 업데이트:', {
                  id: item.id,
                  before: { confirmedAt: item.confirmedAt },
                  after: { confirmedAt: updatedItem.confirmedAt }
                });
                return updatedItem;
              }
              return item;
            })
          }
        };
        
        queryClient.setQueryData(['dashboard', 'field-replies'], updatedData);
        console.log('✅ Optimistic update 완료:', updatedData.data.recent.find(r => r.id === id)?.confirmedAt);
      }

      return { previousData };
    },
    onSuccess: (data, variables) => {
      console.log('✅ API 호출 성공:', { data, variables });
      
      // 성공한 API 응답의 실제 데이터 확인
      if (data?.data) {
        console.log('📊 서버에서 받은 실제 데이터:', {
          id: data.data.id,
          confirmed: data.data.confirmed,
          confirmedAt: data.data.confirmedAt
        });
        
        // 서버 응답과 optimistic update가 일치하는지 확인
        const currentCache = queryClient.getQueryData(['dashboard', 'field-replies']) as DashboardFieldRepliesResponse;
        if (currentCache) {
          const targetItem = currentCache.data.recent.find(item => item.id === variables.id);
          console.log('🔍 캐시 vs 서버 비교:', {
            cacheConfirmedAt: targetItem?.confirmedAt,
            serverConfirmedAt: data.data.confirmedAt,
            serverConfirmed: data.data.confirmed,
            expectedConfirmed: variables.confirmed
          });
        }
      }
      
      // 성공 시 서버 응답 데이터로 캐시 수동 업데이트 (invalidateQueries 대신)
      if (data?.data && variables.id) {
        console.log('🔄 서버 응답으로 캐시 수동 업데이트');
        const currentCache = queryClient.getQueryData(['dashboard', 'field-replies']) as DashboardFieldRepliesResponse;
        
        if (currentCache) {
          const updatedCache = {
            ...currentCache,
            data: {
              ...currentCache.data,
              recent: currentCache.data.recent.map(item => 
                item.id === variables.id 
                  ? { 
                      ...item, 
                      confirmedAt: data.data.confirmedAt // 서버에서 받은 정확한 값 사용
                    }
                  : item
              )
            }
          };
          
          queryClient.setQueryData(['dashboard', 'field-replies'], updatedCache);
          console.log('✅ 서버 응답으로 캐시 업데이트 완료:', {
            id: variables.id,
            serverConfirmedAt: data.data.confirmedAt
          });
        }
      }
    },
    onError: (error, variables, context) => {
      console.error('❌ 현장 회신 확인 상태 토글 실패:', error);
      
      // 에러 시 이전 데이터로 즉시 롤백
      if (context?.previousData) {
        queryClient.setQueryData(['dashboard', 'field-replies'], context.previousData);
        console.log('🔄 에러로 인한 데이터 롤백 완료');
      }
    }
  });
}