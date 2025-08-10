import { useState, useMemo, useEffect } from 'react';
import { Eye, MessageSquare, Filter, Search, ChevronDown, ChevronRight, Trash2, AlertTriangle } from 'lucide-react';
import { useResponseNotes } from '@/hooks/useResponseNotes';
import { OperationTeam, ResponseNoteData, WorkOrder } from '@/types';
import { useWorkOrders as useWorkOrdersAPI } from '@/hooks/useWorkOrdersAPI';

// 회신 메모 상세보기 모달
const ResponseNoteViewModal = ({ 
  note, 
  workOrder,
  onClose, 
  onDelete 
}: { 
  note: ResponseNoteData; 
  workOrder?: WorkOrder;
  onClose: () => void;
  onDelete: (id: string) => void;
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    onDelete(note.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">현장 회신 메모 상세</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Eye className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* 기본 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">작업지시 ID</label>
              <div className="text-sm text-gray-900">{note.workOrderId}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">작업구분</label>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                note.side === 'DU' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
              }`}>
                {note.side}측
              </span>
            </div>
            {note.ruId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RU ID</label>
                <div className="text-sm text-gray-900">{note.ruId}</div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">작성일시</label>
              <div className="text-sm text-gray-900">{new Date(note.createdAt).toLocaleString()}</div>
            </div>
          </div>

          {/* 메모 내용 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">회신 메모 내용</label>
            <div className="bg-gray-50 p-4 rounded-lg min-h-[200px]">
              <div className="text-sm text-gray-900 whitespace-pre-wrap font-mono">
                {note.content || '내용이 없습니다.'}
              </div>
            </div>
          </div>

          {/* 버튼들 */}
          <div className="flex justify-between pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
            >
              <Trash2 className="w-4 h-4" />
              삭제
            </button>
            
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              닫기
            </button>
          </div>
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <h3 className="text-lg font-medium text-gray-900">메모 삭제 확인</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              이 회신 메모를 삭제하시겠습니까? 삭제된 메모는 복구할 수 없습니다.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function Board() {
  const { responseNotes, loading, error, deleteResponseNote, refreshData } = useResponseNotes();
  const { workOrders } = useWorkOrdersAPI();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSide, setSelectedSide] = useState<'all' | 'DU' | 'RU'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [viewingDetailId, setViewingDetailId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

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
      grouped[mgmt].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
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
    } else {
      alert(result.error || '삭제 중 오류가 발생했습니다.');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedSide('all');
  };

  const activeFiltersCount = [searchTerm, selectedSide !== 'all'].filter(Boolean).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <div className="text-gray-600">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-red-600">
          <div className="text-lg font-medium mb-2">오류가 발생했습니다</div>
          <div className="text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">현장 회신 메모 관리</h1>
              <p className="text-gray-600 mt-1">등록된 현장 회신 메모를 확인하고 관리하세요</p>
            </div>
          </div>
        </div>

        {/* 검색 및 필터 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="관리번호, 메모 내용, RU ID 등으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn ${activeFiltersCount > 0 ? 'btn-primary' : 'btn-secondary'} relative`}
            >
              <Filter className="w-4 h-4 mr-1" />
              필터
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    작업구분
                  </label>
                  <select
                    value={selectedSide}
                    onChange={(e) => setSelectedSide(e.target.value as 'all' | 'DU' | 'RU')}
                    className="input w-full"
                  >
                    <option value="all">전체</option>
                    <option value="DU">DU측</option>
                    <option value="RU">RU측</option>
                  </select>
                </div>
                
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="btn btn-secondary"
                    disabled={activeFiltersCount === 0}
                  >
                    초기화
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 통계 */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-gray-600">
            총 {filteredNotes.length}건의 회신 메모
            {activeFiltersCount > 0 && ' (필터링됨)'}
          </div>
        </div>

        {/* 메모 리스트 */}
        <div className="space-y-4">
          {Object.keys(notesByManagementNumber).length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                <MessageSquare className="h-12 w-12" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                회신 메모가 없습니다
              </h3>
              <p className="text-gray-600">
                작업이 완료되고 회신 메모가 작성되면 여기에 표시됩니다
              </p>
            </div>
          ) : (
            Object.entries(notesByManagementNumber)
              .sort(([a], [b]) => b.localeCompare(a)) // 최신 관리번호 우선
              .map(([managementNumber, notes]) => {
                const isCollapsed = collapsedGroups.has(managementNumber);
                const firstNote = notes[0];
                
                return (
                  <div key={managementNumber} className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleGroupCollapse(managementNumber)}
                    >
                      <div className="flex items-center space-x-3">
                        {isCollapsed ? (
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                        <div className="flex items-center space-x-3">
                          <span className="font-mono text-sm bg-gray-100 px-3 py-1 rounded">
                            {managementNumber}
                          </span>
                          <span className="text-lg font-semibold text-gray-900">
                            {notes.length}건
                          </span>
                          <span className="text-sm text-gray-500">
                            {firstNote.operationTeam} • {firstNote.equipmentName}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {!isCollapsed && (
                      <div className="border-t border-gray-200">
                        <div className="divide-y divide-gray-100">
                          {notes.map((note) => (
                            <div key={note.id} className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                      note.side === 'DU' 
                                        ? 'bg-blue-100 text-blue-800' 
                                        : 'bg-green-100 text-green-800'
                                    }`}>
                                      {note.side}측
                                    </span>
                                    {note.ruId && (
                                      <span className="text-xs text-gray-600">
                                        RU ID: {note.ruId}
                                      </span>
                                    )}
                                  </div>
                                  
                                  <div className="text-sm text-gray-700 mb-2 line-clamp-2">
                                    {note.content || '내용이 없습니다'}
                                  </div>
                                  
                                  <div className="text-xs text-gray-500">
                                    작성일: {new Date(note.createdAt).toLocaleString()}
                                    {note.updatedAt && note.updatedAt !== note.createdAt && (
                                      <> • 수정일: {new Date(note.updatedAt).toLocaleString()}</>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2 ml-4">
                                  <button
                                    onClick={() => setViewingDetailId(note.id)}
                                    className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md"
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
                  </div>
                );
              })
          )}
        </div>
      </div>
      
      {viewingDetailId && (
        <ResponseNoteViewModal
          note={filteredNotes.find(n => n.id === viewingDetailId)!}
          workOrder={filteredNotes.find(n => n.id === viewingDetailId)?.workOrder}
          onClose={() => setViewingDetailId(null)}
          onDelete={handleDeleteNote}
        />
      )}
    </div>
  );
}