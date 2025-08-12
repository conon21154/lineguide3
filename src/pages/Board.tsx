import { useState, useMemo, useEffect } from 'react';
import { Eye, MessageSquare, Filter, Search, ChevronDown, ChevronRight, Trash2, AlertTriangle } from 'lucide-react';
import { useResponseNotes } from '@/hooks/useResponseNotes';
import { OperationTeam, ResponseNoteData, WorkOrder } from '@/types';
import { useWorkOrders as useWorkOrdersAPI } from '@/hooks/useWorkOrdersAPI';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';

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
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">현장 회신 메모 상세</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <Eye className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* 기본 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="text-sm text-slate-900">{new Date(note.createdAt).toLocaleString()}</div>
            </div>
          </div>

          {/* 메모 내용 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">회신 메모 내용</label>
            <div className="bg-slate-50 p-4 rounded-lg min-h-[200px]">
              <div className="text-sm text-slate-900 whitespace-pre-wrap font-mono">
                {note.content || '내용이 없습니다.'}
              </div>
            </div>
          </div>

          {/* 버튼들 */}
          <div className="flex justify-between pt-4 border-t border-slate-200">
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
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <h3 className="text-lg font-medium text-slate-900">메모 삭제 확인</h3>
            </div>
            <p className="text-sm text-slate-500 mb-6">
              이 회신 메모를 삭제하시겠습니까? 삭제된 메모는 복구할 수 없습니다.
            </p>
            <div className="flex justify-end gap-2">
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
    <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6 bg-slate-50">
      <PageHeader
        title="현장 회신 메모 관리"
        subtitle="등록된 현장 회신 메모를 확인하고 관리하세요"
      />

      {/* 검색 및 필터 */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="관리번호, 메모 내용, RU ID 등으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Button
            variant={activeFiltersCount > 0 ? 'primary' : 'secondary'}
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <Filter className="w-4 h-4 mr-1" />
            필터
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      <div className="flex items-center space-x-3">
                        {isCollapsed ? (
                          <ChevronRight className="h-5 w-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-slate-400" />
                        )}
                        <div className="flex items-center space-x-3">
                          <span className="font-mono text-sm bg-slate-100 px-3 py-1 rounded">
                            {managementNumber}
                          </span>
                          <span className="text-lg font-semibold text-slate-900">
                            {notes.length}건
                          </span>
                          <span className="text-sm text-slate-500">
                            {firstNote.operationTeam} • {firstNote.equipmentName}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {!isCollapsed && (
                      <div className="border-t border-slate-200 mt-4 pt-4">
                        <div className="divide-y divide-slate-100">
                          {notes.map((note) => (
                            <div key={note.id} className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
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
                                    작성일: {new Date(note.createdAt).toLocaleString()}
                                    {note.updatedAt && note.updatedAt !== note.createdAt && (
                                      <> • 수정일: {new Date(note.updatedAt).toLocaleString()}</>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2 ml-4">
                                  <button
                                    onClick={() => setViewingDetailId(note.id)}
                                    className="p-2 text-[#1E40AF] hover:text-[#1E3A8A] hover:bg-[#1E40AF]/10 rounded-md"
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
    </div>
  );
}