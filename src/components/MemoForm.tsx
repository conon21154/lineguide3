import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, CheckCircle2, Loader2, Camera, Upload, Trash2 } from 'lucide-react';
import { useMemoForm } from '@/hooks/useMemoBase';
import {
  generateTemplate,
  createInitialDuFields,
  createInitialRuFields,
  SIGNAL_OPTIONS,
  MUX_INSTALL_OPTIONS,
  type DuFormFields,
  type RuFormFields
} from '@/utils/memoTemplate';
import { toast } from 'sonner';
import { FieldPhoto } from '@/types';
import CameraCapture from './CameraCapture';

interface MemoFormProps {
  workOrderId: number | string;
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function MemoForm({ workOrderId, onClose, onSuccess }: MemoFormProps) {
  const {
    baseInfo,
    isLoading,
    error,
    saveMemo,
    isSaving,
    saveError,
    saveSuccess,
    canSave,
    resetSaveState
  } = useMemoForm(workOrderId);

  // 폼 상태
  const [duFields, setDuFields] = useState<DuFormFields>(createInitialDuFields());
  const [ruFields, setRuFields] = useState<RuFormFields>(createInitialRuFields());
  const [preview, setPreview] = useState<string>('');
  
  // 카메라 상태
  const [photos, setPhotos] = useState<FieldPhoto[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  
  // 파일 첨부 상태
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState<{ [key: string]: string }>({});

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

  // 파일 첨부 관련 함수들
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    // 총 사진 개수 제한 (기존 + 새로 선택한 것)
    const totalCount = attachedFiles.length + imageFiles.length;
    if (totalCount > 5) {
      alert(`사진은 최대 5장까지 첨부할 수 있습니다. (현재: ${attachedFiles.length}장, 선택: ${imageFiles.length}장)`);
      event.target.value = '';
      return;
    }

    // 파일 크기 체크 (각 파일당 10MB 제한)
    const oversizedFiles = imageFiles.filter(file => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      alert(`파일 크기가 10MB를 초과하는 사진이 있습니다: ${oversizedFiles.map(f => f.name).join(', ')}`);
      event.target.value = '';
      return;
    }
    
    // 이전 프리뷰 URL 정리
    attachedFiles.forEach(file => {
      if (filePreviewUrls[file.name]) {
        URL.revokeObjectURL(filePreviewUrls[file.name]);
      }
    });

    // 새 파일들 추가
    setAttachedFiles(prev => [...prev, ...imageFiles]);
    
    // 새 프리뷰 URL 생성
    const newPreviewUrls: { [key: string]: string } = {};
    imageFiles.forEach(file => {
      newPreviewUrls[file.name] = URL.createObjectURL(file);
    });
    
    setFilePreviewUrls(prev => ({ ...prev, ...newPreviewUrls }));
    
    // input 초기화
    event.target.value = '';
  };

  const handleFileRemove = (fileName: string) => {
    setAttachedFiles(prev => prev.filter(file => file.name !== fileName));
    
    // 프리뷰 URL 정리
    if (filePreviewUrls[fileName]) {
      URL.revokeObjectURL(filePreviewUrls[fileName]);
      setFilePreviewUrls(prev => {
        const newUrls = { ...prev };
        delete newUrls[fileName];
        return newUrls;
      });
    }
  };

  // 컴포넌트 언마운트 시 URL 정리
  useEffect(() => {
    return () => {
      Object.values(filePreviewUrls).forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, [filePreviewUrls]);

  // 베이스 정보 로드 시 초기값 설정
  useEffect(() => {
    if (baseInfo) {
      if (baseInfo.side === 'DU측') {
        setDuFields(createInitialDuFields(baseInfo));
      } else {
        setRuFields(createInitialRuFields(baseInfo));
      }
    }
  }, [baseInfo]);

  // 실시간 미리보기 업데이트
  useEffect(() => {
    if (baseInfo) {
      const currentFields = baseInfo.side === 'DU측' ? duFields : ruFields;
      const newPreview = generateTemplate(baseInfo.side, currentFields);
      setPreview(newPreview);
    }
  }, [baseInfo, duFields, ruFields]);

  // 저장 성공 처리
  useEffect(() => {
    if (saveSuccess) {
      toast.success('메모가 저장되었습니다. (상태: 메모 작성완료)');
      onSuccess?.();
      onClose?.();
    }
  }, [saveSuccess, onSuccess, onClose]);

  // DU측 필드 업데이트
  const updateDuField = (field: keyof DuFormFields, value: string) => {
    setDuFields(prev => ({ ...prev, [field]: value }));
  };

  // RU측 필드 업데이트
  const updateRuField = (field: keyof RuFormFields, value: string) => {
    setRuFields(prev => ({ ...prev, [field]: value }));
  };

  // 폼 제출
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canSave || !baseInfo) return;

    // 필수 필드 검증 (선택적)
    const currentFields = baseInfo.side === 'DU측' ? duFields : ruFields;
    
    saveMemo({
      workOrderId: baseInfo.workOrderId,
      content: preview,
      side: baseInfo.side,
      photos: attachedFiles.length > 0 ? attachedFiles : undefined
    });
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
            <span>작업지시 정보를 불러오는 중...</span>
          </div>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    const errorMessage = error instanceof Error ? error.message : '작업지시 정보를 불러올 수 없습니다';
    console.error('MemoForm 오류:', error);
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center text-red-600 mb-4">
            <AlertTriangle className="w-6 h-6 mr-2" />
            <span>오류가 발생했습니다</span>
          </div>
          <p className="text-gray-600 mb-4">
            {errorMessage}
          </p>
          {errorMessage.includes('인증') && (
            <p className="text-sm text-yellow-600 mb-4">
              로그인이 필요합니다. 페이지를 새로고침해주세요.
            </p>
          )}
          <div className="flex justify-end gap-2">
            {errorMessage.includes('인증') && (
              <button 
                onClick={() => window.location.reload()} 
                className="btn btn-primary"
              >
                새로고침
              </button>
            )}
            <button onClick={onClose} className="btn btn-secondary">
              닫기
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!baseInfo) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">현장 회신 메모 작성</h2>
            <span className={`px-2 py-1 text-xs rounded-full ${
              baseInfo.side === 'DU측' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-green-100 text-green-800'
            }`}>
              {baseInfo.side}
            </span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-6">
          {/* 기본 정보 표시 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">작업지시 기본 정보</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">운용팀:</span> {baseInfo.operationTeam}
              </div>
              <div>
                <span className="font-medium">관리번호:</span> {baseInfo.managementNumber}
              </div>
              <div>
                <span className="font-medium">상태:</span> 
                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                  canSave ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {baseInfo.status}
                </span>
              </div>
              {baseInfo.side === 'DU측' && baseInfo.duName && (
                <div>
                  <span className="font-medium">DU명:</span> {baseInfo.duName}
                </div>
              )}
              {baseInfo.side === 'RU측' && (
                <>
                  {baseInfo.ruName && (
                    <div>
                      <span className="font-medium">RU명:</span> {baseInfo.ruName}
                    </div>
                  )}
                  {baseInfo.coSiteCount5g && (
                    <div>
                      <span className="font-medium">Co-site 수량:</span> {baseInfo.coSiteCount5g}식
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 완료 상태 알림 */}
          {!canSave && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-800 font-medium">완료된 작업만 회신 메모 등록 가능</p>
                <p className="text-yellow-700 text-sm mt-1">
                  작업 상태가 '완료' 또는 '확인완료'일 때만 회신 메모를 작성할 수 있습니다.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 입력 필드 */}
              <div className="space-y-4">
                <h3 className="font-medium text-lg">입력 정보</h3>
                
                {baseInfo.side === 'DU측' ? (
                  // DU측 입력 필드
                  <>
                    <div>
                      <label htmlFor="signalYN" className="block text-sm font-medium text-gray-700 mb-1">
                        RU 광신호 유/무 *
                      </label>
                      <select
                        id="signalYN"
                        value={duFields.signalYN}
                        onChange={(e) => updateDuField('signalYN', e.target.value)}
                        className="input w-full"
                        disabled={!canSave}
                      >
                        {SIGNAL_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="mux" className="block text-sm font-medium text-gray-700 mb-1">
                        5G MUX
                      </label>
                      <input
                        type="text"
                        id="mux"
                        value={duFields.mux}
                        onChange={(e) => updateDuField('mux', e.target.value)}
                        placeholder="5G MUX 정보를 입력하세요"
                        className="input w-full"
                        disabled={!canSave}
                      />
                    </div>

                    <div>
                      <label htmlFor="tie" className="block text-sm font-medium text-gray-700 mb-1">
                        5G TIE 선번
                      </label>
                      <input
                        type="text"
                        id="tie"
                        value={duFields.tie}
                        onChange={(e) => updateDuField('tie', e.target.value)}
                        placeholder="5G TIE 선번을 입력하세요"
                        className="input w-full"
                        disabled={!canSave}
                      />
                    </div>

                    <div>
                      <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
                        특이사항
                      </label>
                      <textarea
                        id="note"
                        value={duFields.note}
                        onChange={(e) => updateDuField('note', e.target.value)}
                        placeholder="특이사항을 입력하세요"
                        rows={4}
                        className="input w-full resize-none"
                        disabled={!canSave}
                      />
                    </div>
                  </>
                ) : (
                  // RU측 입력 필드
                  <>
                    <div>
                      <label htmlFor="muxInstallYN" className="block text-sm font-medium text-gray-700 mb-1">
                        5G MUX 설치유무 *
                      </label>
                      <select
                        id="muxInstallYN"
                        value={ruFields.muxInstallYN}
                        onChange={(e) => updateRuField('muxInstallYN', e.target.value)}
                        className="input w-full"
                        disabled={!canSave}
                      >
                        {MUX_INSTALL_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="mux" className="block text-sm font-medium text-gray-700 mb-1">
                        5G MUX 선번
                      </label>
                      <input
                        type="text"
                        id="mux"
                        value={ruFields.mux}
                        onChange={(e) => updateRuField('mux', e.target.value)}
                        placeholder="5G MUX 선번을 입력하세요"
                        className="input w-full"
                        disabled={!canSave}
                      />
                    </div>

                    <div>
                      <label htmlFor="tie" className="block text-sm font-medium text-gray-700 mb-1">
                        5G TIE 선번
                      </label>
                      <input
                        type="text"
                        id="tie"
                        value={ruFields.tie}
                        onChange={(e) => updateRuField('tie', e.target.value)}
                        placeholder="5G TIE 선번을 입력하세요"
                        className="input w-full"
                        disabled={!canSave}
                      />
                    </div>

                    <div>
                      <label htmlFor="lteMux" className="block text-sm font-medium text-gray-700 mb-1">
                        LTE MUX
                      </label>
                      <input
                        type="text"
                        id="lteMux"
                        value={ruFields.lteMux}
                        onChange={(e) => updateRuField('lteMux', e.target.value)}
                        placeholder="LTE MUX 정보를 입력하세요"
                        className="input w-full"
                        disabled={!canSave}
                      />
                    </div>

                    <div>
                      <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
                        특이사항
                      </label>
                      <textarea
                        id="note"
                        value={ruFields.note}
                        onChange={(e) => updateRuField('note', e.target.value)}
                        placeholder="특이사항을 입력하세요"
                        rows={4}
                        className="input w-full resize-none"
                        disabled={!canSave}
                      />
                    </div>
                  </>
                )}

                {/* 사진 첨부 섹션 */}
                <div className="mt-6 pt-4 border-t">
                  <h4 className="font-medium text-gray-900 mb-3">사진 첨부</h4>
                  
                  {/* 파일 선택 버튼 */}
                  <div className="mb-4">
                    <label 
                      htmlFor="photo-upload" 
                      className={`inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 cursor-pointer transition-colors ${
                        !canSave ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      사진 선택
                    </label>
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      disabled={!canSave}
                      className="hidden"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      JPG, PNG, GIF 등 이미지 파일만 첨부 가능합니다. (최대 5장, 각 파일 10MB 이하)
                    </p>
                  </div>

                  {/* 첨부된 사진 미리보기 */}
                  {attachedFiles.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="text-sm font-medium text-gray-700">
                        첨부된 사진 ({attachedFiles.length}개)
                      </h5>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {attachedFiles.map((file, index) => (
                          <div key={`${file.name}-${index}`} className="relative group">
                            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                              <img
                                src={filePreviewUrls[file.name]}
                                alt={`첨부 사진 ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <button
                              onClick={() => handleFileRemove(file.name)}
                              disabled={!canSave}
                              className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50"
                              title="사진 삭제"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                            <div className="mt-1 text-xs text-gray-500 truncate">
                              {file.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 미리보기 */}
              <div className="space-y-4">
                <h3 className="font-medium text-lg">미리보기</h3>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <pre 
                    className="text-sm font-mono whitespace-pre-wrap text-gray-800 min-h-[300px]"
                    style={{ whiteSpace: 'pre-wrap' }}
                  >
                    {preview}
                  </pre>
                </div>
              </div>
            </div>

            {/* 에러 메시지 */}
            {saveError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-800 font-medium">저장 실패</p>
                  <p className="text-red-700 text-sm mt-1">
                    {saveError instanceof Error ? saveError.message : '메모 저장 중 오류가 발생했습니다'}
                  </p>
                </div>
              </div>
            )}

            {/* 버튼 */}
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={isSaving}
              >
                취소
              </button>
              <button
                type="submit"
                disabled={!canSave || isSaving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title={!canSave ? "완료된 작업만 회신 메모를 등록할 수 있습니다" : ""}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    저장
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}