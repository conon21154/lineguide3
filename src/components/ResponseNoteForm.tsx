import { useState, useEffect } from 'react';
import { MessageSquare, Save, Trash2, RotateCcw, AlertTriangle, CheckCircle2, X, Camera } from 'lucide-react';
import { WorkOrder, ResponseNoteData, FieldPhoto } from '@/types';
import { useWorkOrders as useWorkOrdersAPI } from '@/hooks/useWorkOrdersAPI';
import CameraCapture from './CameraCapture';

interface ResponseNoteFormProps {
  workOrder: WorkOrder;
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function ResponseNoteForm({ workOrder, onClose, onSuccess }: ResponseNoteFormProps) {
  const { 
    createResponseNote, 
    updateResponseNoteContent, 
    clearResponseNoteContent, 
    deleteResponseNoteEntry, 
    checkResponseNoteDuplicate,
    fetchMemoTemplate,
    loading 
  } = useWorkOrdersAPI();
  const [content, setContent] = useState('');
  const [existingNote, setExistingNote] = useState<ResponseNoteData | null>(null);
  const [duplicateInfo, setDuplicateInfo] = useState<{ exists: boolean; existing?: any } | null>(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [templateLoaded, setTemplateLoaded] = useState(false);
  const [photos, setPhotos] = useState<FieldPhoto[]>([]);
  const [showCamera, setShowCamera] = useState(false);

  // 완료 상태 확인
  const isCompleted = workOrder.status === 'completed' || workOrder.status === '확인완료';
  const canPost = isCompleted;

  // side와 ruId 결정
  const side: 'DU' | 'RU' = workOrder.workType === 'DU측' ? 'DU' : 'RU';
  const ruId = workOrder.representativeRuId;

  // 카메라 관련 함수들
  const handlePhotoCaptured = (photo: FieldPhoto) => {
    setPhotos(prev => [...prev, photo]);
  };

  const handlePhotoDelete = (photoId: string) => {
    setPhotos(prev => prev.filter(photo => photo.id !== photoId));
    // URL.revokeObjectURL로 메모리 해제
    const photo = photos.find(p => p.id === photoId);
    if (photo?.url) {
      URL.revokeObjectURL(photo.url);
    }
  };

  const handlePhotoDescription = (photoId: string, description: string) => {
    setPhotos(prev => prev.map(photo => 
      photo.id === photoId ? { ...photo, description } : photo
    ));
  };

  // 컴포넌트 마운트 시 중복 확인 및 템플릿 로드
  useEffect(() => {
    const checkExistingNote = async () => {
      if (!workOrder.id) return;

      try {
        const result = await checkResponseNoteDuplicate(workOrder.id, side, ruId);
        setDuplicateInfo(result);
        
        if (result.exists && result.existing) {
          // 기존 메모가 있으면 기존 내용을 표시
          setContent(result.existing.content || '');
          setTemplateLoaded(true);
        } else {
          // 기존 메모가 없으면 템플릿 로드
          try {
            const templateData = await fetchMemoTemplate(workOrder.id);
            if (templateData && templateData.template) {
              setContent(templateData.template);
              setTemplateLoaded(true);
            }
          } catch (templateError) {
            console.error('템플릿 로드 실패:', templateError);
          }
        }
      } catch (error) {
        console.error('중복 확인 실패:', error);
      }
    };

    checkExistingNote();
  }, [workOrder.id, side, ruId, checkResponseNoteDuplicate, fetchMemoTemplate]);

  // 회신 메모 등록/수정
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPost || !content.trim()) return;

    setSubmitting(true);
    try {
      let result;
      
      if (duplicateInfo?.exists && duplicateInfo.existing?.id) {
        // 기존 메모 수정
        result = await updateResponseNoteContent(duplicateInfo.existing.id, content.trim());
      } else {
        // 새 메모 생성
        result = await createResponseNote({
          workOrderId: workOrder.id,
          side,
          ruId,
          content: content.trim()
        });
      }

      if (result.success) {
        onSuccess?.();
        onClose?.();
      } else {
        alert(result.error || '회신 메모 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('회신 메모 저장 실패:', error);
      alert('회신 메모 저장 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  // 메모 비우기
  const handleClear = async () => {
    if (!duplicateInfo?.exists || !duplicateInfo.existing?.id) return;

    try {
      const result = await clearResponseNoteContent(duplicateInfo.existing.id);
      if (result.success) {
        setContent('');
        setShowConfirmClear(false);
        onSuccess?.();
      } else {
        alert(result.error || '메모 비우기에 실패했습니다.');
      }
    } catch (error) {
      console.error('메모 비우기 실패:', error);
      alert('메모 비우기 중 오류가 발생했습니다.');
    }
  };

  // 메모 삭제
  const handleDelete = async () => {
    if (!duplicateInfo?.exists || !duplicateInfo.existing?.id) return;

    try {
      const result = await deleteResponseNoteEntry(duplicateInfo.existing.id);
      if (result.success) {
        setContent('');
        setDuplicateInfo({ exists: false });
        setShowConfirmDelete(false);
        onSuccess?.();
        onClose?.();
      } else {
        alert(result.error || '메모 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('메모 삭제 실패:', error);
      alert('메모 삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">현장 회신 메모</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* 작업지시 정보 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">관리번호:</span> {workOrder.managementNumber}
              </div>
              <div>
                <span className="font-medium">작업구분:</span> {workOrder.workType}
              </div>
              <div>
                <span className="font-medium">운용팀:</span> {workOrder.operationTeam}
              </div>
              <div>
                <span className="font-medium">상태:</span> 
                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                  isCompleted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {workOrder.status}
                </span>
              </div>
            </div>
          </div>

          {/* 상태 알림 */}
          {!canPost && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-800 font-medium">완료된 작업만 회신 메모 등록 가능</p>
                <p className="text-yellow-700 text-sm mt-1">
                  작업 상태가 '완료' 또는 '확인완료'일 때만 회신 메모를 작성할 수 있습니다.
                </p>
              </div>
            </div>
          )}

          {/* 중복 알림 */}
          {duplicateInfo?.exists && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-blue-800 font-medium">기존 회신 메모 발견</p>
                <p className="text-blue-700 text-sm mt-1">
                  이미 등록된 회신 메모가 있습니다. 수정하거나 새로 작성할 수 있습니다.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 메모 입력 */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                회신 메모 *
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={!canPost || loading}
                placeholder={canPost ? (templateLoaded ? "" : "템플릿을 불러오는 중...") : "완료된 작업만 회신 메모를 작성할 수 있습니다."}
                rows={12}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm whitespace-pre-wrap ${
                  !canPost ? 'bg-gray-100 text-gray-500' : ''
                }`}
                style={{ whiteSpace: 'pre-wrap' }}
                required
              />
              <div className="text-right text-xs text-gray-500 mt-1">
                {content.length} / 2000자
              </div>
            </div>

            {/* 현장 사진 섹션 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  현장 사진 ({photos.length}/4)
                </label>
                <button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  disabled={!canPost || photos.length >= 4}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Camera className="w-4 h-4" />
                  사진 촬영
                </button>
              </div>

              {/* 촬영된 사진들 */}
              {photos.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                      <div className="aspect-video relative">
                        <img
                          src={photo.url}
                          alt={`현장사진 ${photo.id}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handlePhotoDelete(photo.id)}
                          className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="p-2">
                        <input
                          type="text"
                          placeholder="사진 설명 (선택사항)"
                          value={photo.description || ''}
                          onChange={(e) => handlePhotoDescription(photo.id, e.target.value)}
                          className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(photo.capturedAt).toLocaleString('ko-KR')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {photos.length === 0 && (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                  <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">현장 사진을 촬영해 주세요</p>
                  <p className="text-xs mt-1">최대 4장까지 촬영 가능합니다</p>
                </div>
              )}
            </div>

            {/* 버튼 */}
            <div className="flex justify-between pt-4">
              <div className="flex gap-2">
                {/* 메모 비우기 버튼 */}
                {duplicateInfo?.exists && (
                  <button
                    type="button"
                    onClick={() => setShowConfirmClear(true)}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-md hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-4 h-4" />
                    메모 비우기
                  </button>
                )}
                
                {/* 메모 삭제 버튼 */}
                {duplicateInfo?.exists && (
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(true)}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                    삭제
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={!canPost || !content.trim() || submitting || loading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {submitting ? '저장 중...' : (duplicateInfo?.exists ? '수정' : '등록')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* 메모 비우기 확인 모달 */}
      {showConfirmClear && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">메모 비우기 확인</h3>
            <p className="text-sm text-gray-500 mb-6">
              회신 메모 내용을 모두 지우시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleClear}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 disabled:opacity-50"
              >
                비우기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 메모 삭제 확인 모달 */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">메모 삭제 확인</h3>
            <p className="text-sm text-gray-500 mb-6">
              회신 메모를 완전히 삭제하시겠습니까? 삭제된 메모는 복구할 수 없습니다.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 카메라 모달 */}
      {showCamera && (
        <CameraCapture
          onPhotoCaptured={(photo) => {
            handlePhotoCaptured(photo);
            setShowCamera(false);
          }}
          maxPhotos={4}
          currentPhotos={photos}
        />
      )}
    </div>
  );
}