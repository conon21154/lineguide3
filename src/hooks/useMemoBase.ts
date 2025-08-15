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
  photos?: File[];
}

// Base64 인코딩된 사진 타입
interface Base64Photo {
  data: string;
  filename: string;
  mimetype: string;
}

// JSON 전송용 메모 저장 요청 타입
interface JsonSaveMemoRequest {
  workOrderId: number;
  content: string;
  side: 'DU측' | 'RU측';
  photos?: Base64Photo[];
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

// 이미지 크기를 줄이는 함수
const resizeImage = (file: File, maxWidth: number = 800, maxHeight: number = 600, quality: number = 0.8): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      // 비율을 유지하면서 크기 조정
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // 이미지 그리기
      ctx.drawImage(img, 0, 0, width, height);
      
      // blob으로 변환
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(resizedFile);
          } else {
            resolve(file); // 실패 시 원본 반환
          }
        },
        'image/jpeg',
        quality
      );
    };
    
    img.src = URL.createObjectURL(file);
  });
};

// 파일을 Base64로 변환하는 유틸리티 함수
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // data:image/jpeg;base64, 부분을 제거하고 base64 데이터만 추출
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
  });
};

// 메모 저장 훅
export function useSaveMemo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SaveMemoRequest): Promise<SaveMemoResponse> => {
      // 파일이 있는 경우 base64로 인코딩해서 JSON으로 전송
      if (data.photos && data.photos.length > 0) {
        console.log('사진과 함께 메모 저장 중...', data.photos.length, '개');
        
        // 먼저 이미지 크기를 줄임 (800x600, 품질 70%)
        const resizedPhotos = await Promise.all(
          data.photos.map(file => resizeImage(file, 800, 600, 0.7))
        );
        
        console.log('이미지 리사이즈 완료');
        resizedPhotos.forEach((file, index) => {
          console.log(`사진 ${index + 1}: ${file.name}, 크기: ${(file.size / 1024).toFixed(1)}KB`);
        });
        
        // 모든 파일을 base64로 변환
        const base64Photos: Base64Photo[] = await Promise.all(
          resizedPhotos.map(async (file) => ({
            data: await fileToBase64(file),
            filename: file.name,
            mimetype: file.type
          }))
        );

        const jsonData: JsonSaveMemoRequest = {
          workOrderId: data.workOrderId,
          content: data.content,
          side: data.side,
          photos: base64Photos
        };

        console.log('JSON 데이터로 전송:', jsonData);
        const response = await apiPost<SaveMemoResponse>(API_ENDPOINTS.RESPONSE_NOTES.CREATE, jsonData);
        return response;
      } else {
        // 파일이 없으면 기존 방식 사용
        console.log('텍스트만 저장 중...');
        const response = await apiPost<SaveMemoResponse>(API_ENDPOINTS.RESPONSE_NOTES.CREATE, data);
        return response;
      }
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