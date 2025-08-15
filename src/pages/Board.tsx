import { useState, useMemo, useEffect } from 'react';
import { Eye, MessageSquare, Filter, Search, ChevronDown, ChevronRight, Trash2, AlertTriangle, Download, Image, X } from 'lucide-react';
import { useResponseNotes } from '@/hooks/useResponseNotes';
import { ResponseNoteData, WorkOrder } from '@/types';
import { useWorkOrders as useWorkOrdersAPI } from '@/hooks/useWorkOrdersAPI';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatKSTDate } from '@/utils/dateUtils';
import { 
  exportResponseNotesToExcel, 
  exportResponseNotesToCSV, 
  exportResponseNotesWithSummary,
  COLUMN_OPTIONS
} from '@/utils/excelUtils';

// API 서버 기본 URL (uploads용)
const API_SERVER_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 
  (import.meta.env.MODE === 'production' 
    ? 'https://lineguide3-backend.onrender.com' 
    : 'http://localhost:5000');

// 이미지 확대보기 모달
const ImageModal = ({ 
  imageUrl, 
  onClose 
}: { 
  imageUrl: string; 
  onClose: () => void; 
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[70] p-4">
    <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full flex items-center justify-center z-10"
      >
        <X className="w-6 h-6" />
      </button>
      <img
        src={imageUrl}
        alt="확대보기"
        className="max-w-full max-h-full object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  </div>
);

// 엑셀 내보내기 모달
const ExcelExportModal = ({ 
  onClose,
  notes 
}: { 
  onClose: () => void;
  notes: ResponseNoteData[];
}) => {
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    COLUMN_OPTIONS.map(option => option.value as string)
  );
  const [exportType, setExportType] = useState<'excel' | 'csv' | 'summary'>('excel');
  const [isExporting, setIsExporting] = useState(false);

  const handleColumnToggle = (columnKey: string) => {
    setSelectedColumns(prev => 
      prev.includes(columnKey)
        ? prev.filter(key => key !== columnKey)
        : [...prev, columnKey]
    );
  };

  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      alert('최소 하나의 컬럼을 선택해주세요.');
      return;
    }

    setIsExporting(true);
    
    try {
      let result;
      
      switch (exportType) {
        case 'excel':
          result = exportResponseNotesToExcel(notes, { selectedColumns });
          break;
        case 'csv':
          result = exportResponseNotesToCSV(notes, { selectedColumns });
          break;
        case 'summary':
          result = exportResponseNotesWithSummary(notes, { selectedColumns });
          break;
        default:
          result = { success: false, message: '알 수 없는 내보내기 형식입니다.' };
      }

      if (result.success) {
        alert(result.message);
        onClose();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('내보내기 오류:', error);
      alert('내보내기 중 오류가 발생했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] sm:max-h-[85vh] overflow-y-auto shadow-xl mx-2 sm:mx-4">
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-200">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900">엑셀 내보내기</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ×
          </button>
        </div>
        
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* 내보내기 형식 선택 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">내보내기 형식</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="excel"
                  checked={exportType === 'excel'}
                  onChange={(e) => setExportType(e.target.value as 'excel')}
                  className="mr-2"
                />
                <span className="text-sm">엑셀 파일 (.xlsx)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="csv"
                  checked={exportType === 'csv'}
                  onChange={(e) => setExportType(e.target.value as 'csv')}
                  className="mr-2"
                />
                <span className="text-sm">CSV 파일 (.csv)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="summary"
                  checked={exportType === 'summary'}
                  onChange={(e) => setExportType(e.target.value as 'summary')}
                  className="mr-2"
                />
                <span className="text-sm">엑셀 파일 + 요약 통계 (.xlsx)</span>
              </label>
            </div>
          </div>

          {/* 컬럼 선택 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              내보낼 컬럼 선택 ({selectedColumns.length}개 선택됨)
            </label>
            <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto border border-slate-200 rounded-lg p-3">
              {COLUMN_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(option.value as string)}
                    onChange={() => handleColumnToggle(option.value as string)}
                    className="mr-2"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
            
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setSelectedColumns(COLUMN_OPTIONS.map(opt => opt.value as string))}
                className="text-xs text-[#1E40AF] hover:underline"
              >
                모두 선택
              </button>
              <button
                onClick={() => setSelectedColumns([])}
                className="text-xs text-slate-500 hover:underline"
              >
                모두 해제
              </button>
            </div>
          </div>

          {/* 미리보기 정보 */}
          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="text-sm text-slate-600">
              <div>📊 총 {notes.length.toLocaleString()}개의 현장회신이 내보내집니다.</div>
              <div>📋 {selectedColumns.length}개의 컬럼이 포함됩니다.</div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button 
            onClick={handleExport}
            disabled={isExporting || selectedColumns.length === 0}
            className="min-w-24"
          >
            {isExporting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                처리중...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                내보내기
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

// 회신 메모 상세보기 모달
const ResponseNoteViewModal = ({ 
  note, 
  workOrder,
  onClose, 
  onDelete 
}: { 
  note: ResponseNoteData; 
  onClose: () => void;
  onDelete: (id: string) => void;
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const handleDelete = () => {
    onDelete(note.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] sm:max-h-[85vh] overflow-y-auto shadow-xl mx-2 sm:mx-4">
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-200">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900">현장 회신 메모 상세</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <Eye className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* 기본 정보 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">작업지시 ID</label>
              <div className="text-sm text-slate-900">{note.workOrderId}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">작업구분</label>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                note.side === 'DU' ? 'bg-[#1E40AF]/10 text-[#1E40AF]' : 'bg-green-100 text-green-800'
              }`}>
                {note.side}측
              </span>
            </div>
            {note.ruId && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">RU ID</label>
                <div className="text-sm text-slate-900">{note.ruId}</div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">작성일시</label>
              <div className="text-sm text-slate-900">{formatKSTDate(note.createdAt, true)}</div>
            </div>
          </div>

          {/* 메모 내용 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">회신 메모 내용</label>
            <div className="bg-slate-50 p-3 sm:p-4 rounded-lg min-h-[150px] sm:min-h-[200px]">
              <div className="text-sm text-slate-900 whitespace-pre-wrap font-mono">
                {note.content || '내용이 없습니다.'}
              </div>
            </div>
          </div>


          {/* 첨부된 사진 */}
          {note.photos && note.photos.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                첨부된 사진 ({note.photos.length}개)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {note.photos.map((photo, index) => (
                  <div key={photo.id || index} className="relative group">
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
                      <img
                        src={`${API_SERVER_URL}${photo.url}`}
                        alt={photo.description || `첨부 사진 ${index + 1}`}
                        className="w-full h-full object-cover"
                        onClick={() => setSelectedImageUrl(`${API_SERVER_URL}${photo.url}`)}
                      />
                    </div>
                    {photo.description && (
                      <div className="mt-1 text-xs text-gray-600 text-center truncate">
                        {photo.description}
                      </div>
                    )}
                    <div className="absolute top-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 버튼들 */}
          <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-0 pt-4 border-t border-slate-200">
            <Button
              variant="danger"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-4 h-4" />
              삭제
            </Button>
            
            <Button
              variant="secondary"
              onClick={onClose}
            >
              닫기
            </Button>
          </div>
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <h3 className="text-lg font-medium text-slate-900">메모 삭제 확인</h3>
            </div>
            <p className="text-sm text-slate-500 mb-6">
              이 회신 메모를 삭제하시겠습니까? 삭제된 메모는 복구할 수 없습니다.
            </p>
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
              >
                취소
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
              >
                삭제
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 이미지 확대보기 모달 */}
      {selectedImageUrl && (
        <ImageModal
          imageUrl={selectedImageUrl}
          onClose={() => setSelectedImageUrl(null)}
        />
      )}
    </div>
  );
};

export default function Board() {
  const { responseNotes, loading, error, deleteResponseNote, refreshData } = useResponseNotes();
  const { workOrders } = useWorkOrdersAPI();
  
  // 데이터 로드 확인
  useEffect(() => {
    if (responseNotes.length > 0 && process.env.NODE_ENV === 'development') {
      console.log(`✅ 현장회신 ${responseNotes.length}개 로드 완료`);
    }
  }, [responseNotes]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSide, setSelectedSide] = useState<'all' | 'DU' | 'RU'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [viewingDetailId, setViewingDetailId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ show: false, message: '', type: 'info' });

  // 토스트 표시 함수
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'info' });
    }, 3000);
  };

  // 작업지시 데이터와 매핑해서 추가 정보 포함
  const enrichedNotes = useMemo(() => {
    return responseNotes.map(note => {
      const workOrder = workOrders.find(wo => wo.id === note.workOrderId);
      return {
        ...note,
        workOrder,
        managementNumber: workOrder?.managementNumber || note.workOrderId,
        operationTeam: workOrder?.operationTeam || '알 수 없음',
        equipmentName: workOrder?.equipmentName || '알 수 없음'
      };
    });
  }, [responseNotes, workOrders]);

  // 필터링된 메모들
  const filteredNotes = useMemo(() => {
    return enrichedNotes.filter(note => {
      // 검색어 필터
      if (searchTerm.trim()) {
        const search = searchTerm.toLowerCase();
        const searchableFields = [
          note.content,
          note.managementNumber,
          note.operationTeam,
          note.equipmentName,
          note.ruId || ''
        ];
        
        if (!searchableFields.some(field => 
          field.toLowerCase().includes(search)
        )) {
          return false;
        }
      }

      // 작업구분 필터
      if (selectedSide !== 'all' && note.side !== selectedSide) {
        return false;
      }
      
      return true;
    });
  }, [enrichedNotes, searchTerm, selectedSide]);

  // 관리번호별로 그룹화
  const notesByManagementNumber = useMemo(() => {
    const grouped: Record<string, typeof filteredNotes> = {};
    
    filteredNotes.forEach(note => {
      const baseNumber = note.managementNumber.replace(/_(DU측|RU측)$/g, '');
      if (!grouped[baseNumber]) {
        grouped[baseNumber] = [];
      }
      grouped[baseNumber].push(note);
    });
    
    // 각 그룹별로 최신순 정렬
    Object.keys(grouped).forEach(mgmt => {
      grouped[mgmt].sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        // 유효하지 않은 날짜는 뒤로 밀기
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        return dateB.getTime() - dateA.getTime();
      });
    });
    
    return grouped;
  }, [filteredNotes]);

  const toggleGroupCollapse = (managementNumber: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(managementNumber)) {
      newCollapsed.delete(managementNumber);
    } else {
      newCollapsed.add(managementNumber);
    }
    setCollapsedGroups(newCollapsed);
  };

  const handleDeleteNote = async (id: string) => {
    const result = await deleteResponseNote(id);
    if (result.success) {
      refreshData();
      showToast('현장회신 메모가 삭제되었습니다.', 'success');
    } else {
      showToast(result.error || '삭제 중 오류가 발생했습니다.', 'error');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedSide('all');
  };

  const activeFiltersCount = [searchTerm, selectedSide !== 'all'].filter(Boolean).length;

  if (loading) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-6 md:py-8 bg-slate-50">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E40AF] mx-auto mb-2"></div>
          <div className="text-slate-600">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-6 md:py-8 bg-slate-50">
        <div className="text-center text-red-600">
          <div className="text-lg font-medium mb-2">오류가 발생했습니다</div>
          <div className="text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-6 bg-slate-50">
      <PageHeader
        title="현장 회신 메모 관리"
        subtitle="등록된 현장 회신 메모를 확인하고 관리하세요"
      />

      {/* 검색 및 필터 */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="관리번호, 메모 내용, RU ID 등으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 sm:h-11"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={activeFiltersCount > 0 ? 'primary' : 'secondary'}
              onClick={() => setShowFilters(!showFilters)}
              className="relative h-10 sm:h-11 px-3 sm:px-4"
            >
              <Filter className="w-4 h-4 mr-1" />
              필터
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
            
            <Button
              variant="secondary"
              onClick={() => setShowExcelModal(true)}
              disabled={filteredNotes.length === 0}
              title={filteredNotes.length === 0 ? '내보낼 데이터가 없습니다' : '엑셀로 내보내기'}
              className="h-10 sm:h-11 px-2 sm:px-4"
            >
              <Download className="w-4 h-4 mr-0 sm:mr-1" />
              <span className="hidden sm:inline">엑셀 내보내기</span>
              <span className="sm:hidden">내보내기</span>
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <Field label="작업구분">
                <Select
                  value={selectedSide}
                  onChange={(e) => setSelectedSide(e.target.value as 'all' | 'DU' | 'RU')}
                >
                  <option value="all">전체</option>
                  <option value="DU">DU측</option>
                  <option value="RU">RU측</option>
                </Select>
              </Field>
              
              <div className="flex items-end">
                <Button
                  variant="secondary"
                  onClick={clearFilters}
                  disabled={activeFiltersCount === 0}
                  className="w-full"
                >
                  초기화
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 통계 */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          총 {filteredNotes.length}건의 회신 메모
          {activeFiltersCount > 0 && ' (필터링됨)'}
        </div>
      </div>

      {/* 메모 리스트 */}
      <div className="space-y-4">
        {Object.keys(notesByManagementNumber).length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-slate-400 mb-4">
                <MessageSquare className="h-12 w-12" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                회신 메모가 없습니다
              </h3>
              <p className="text-slate-600">
                작업이 완료되고 회신 메모가 작성되면 여기에 표시됩니다
              </p>
            </div>
          </Card>
        ) : (
            Object.entries(notesByManagementNumber)
              .sort(([a], [b]) => b.localeCompare(a)) // 최신 관리번호 우선
              .map(([managementNumber, notes]) => {
                const isCollapsed = collapsedGroups.has(managementNumber);
                const firstNote = notes[0];
                
                return (
                  <Card key={managementNumber}>
                    <div 
                      className="flex items-center justify-between cursor-pointer hover:bg-slate-50 -m-4 p-4 rounded-2xl transition-colors"
                      onClick={() => toggleGroupCollapse(managementNumber)}
                    >
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        {isCollapsed ? (
                          <ChevronRight className="h-4 sm:h-5 w-4 sm:w-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-4 sm:h-5 w-4 sm:w-5 text-slate-400" />
                        )}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <span className="font-mono text-xs sm:text-sm bg-slate-100 px-2 sm:px-3 py-1 rounded">
                              {managementNumber}
                            </span>
                            <span className="text-base sm:text-lg font-semibold text-slate-900">
                              {notes.length}건
                            </span>
                          </div>
                          <span className="text-xs sm:text-sm text-slate-500">
                            {firstNote.operationTeam} • {firstNote.equipmentName}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {!isCollapsed && (
                      <div className="border-t border-slate-200 mt-4 pt-4">
                        <div className="divide-y divide-slate-100">
                          {notes.map((note) => (
                            <div key={note.id} className="p-3 sm:p-4">
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-0">
                                <div className="flex-1">
                                  <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-2">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                      note.side === 'DU' 
                                        ? 'bg-[#1E40AF]/10 text-[#1E40AF]' 
                                        : 'bg-green-100 text-green-800'
                                    }`}>
                                      {note.side}측
                                    </span>
                                    {note.ruId && (
                                      <span className="text-xs text-slate-600">
                                        RU ID: {note.ruId}
                                      </span>
                                    )}
                                  </div>
                                  
                                  <div className="text-sm text-slate-700 mb-2 line-clamp-2">
                                    {note.content || '내용이 없습니다'}
                                  </div>
                                  
                                  <div className="text-xs text-slate-500">
                                    작성일: {
                                      note.createdAt && note.createdAt !== null
                                        ? formatKSTDate(note.createdAt, true)
                                        : '등록일 확인 중...'
                                    }
                                    {note.updatedAt && note.updatedAt !== note.createdAt && (
                                      <> • 수정일: {
                                        note.updatedAt && note.updatedAt !== null
                                          ? formatKSTDate(note.updatedAt, true) 
                                          : '수정일 확인 중...'
                                      }</>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2 sm:ml-4">
                                  <button
                                    onClick={() => setViewingDetailId(note.id)}
                                    className="p-1.5 sm:p-2 text-[#1E40AF] hover:text-[#1E3A8A] hover:bg-[#1E40AF]/10 rounded-md"
                                    title="상세보기"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteNote(note.id)}
                                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md"
                                    title="삭제"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })
          )}
      </div>
      
      {viewingDetailId && (
        <ResponseNoteViewModal
          note={filteredNotes.find(n => n.id === viewingDetailId)!}
          workOrder={filteredNotes.find(n => n.id === viewingDetailId)?.workOrder}
          onClose={() => setViewingDetailId(null)}
          onDelete={handleDeleteNote}
        />
      )}

      {/* 엑셀 내보내기 모달 */}
      {showExcelModal && (
        <ExcelExportModal
          notes={filteredNotes}
          onClose={() => setShowExcelModal(false)}
        />
      )}

      {/* 토스트 알림 */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-full duration-300">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
            toast.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : toast.type === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {toast.type === 'success' && <Eye className="w-4 h-4" />}
            {toast.type === 'error' && <AlertTriangle className="w-4 h-4" />}
            {toast.type === 'info' && <MessageSquare className="w-4 h-4" />}
            <span className="text-sm font-medium">{toast.message}</span>
            <button 
              onClick={() => setToast({ show: false, message: '', type: 'info' })}
              className="ml-2 text-current opacity-70 hover:opacity-100"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}