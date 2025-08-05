import React, { useState, useMemo } from 'react';
import { Eye, MessageSquare, Check, Clock, Filter, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { useCompletedResponseNotes, useWorkOrders } from '../hooks/useWorkOrders';
import { WorkOrder, OperationTeam } from '../types';
import { useAuth } from '../contexts/AuthContext';

const ResponseNoteViewModal = ({ workOrder, onClose }: { workOrder: WorkOrder, onClose: () => void }) => {
  const workType = workOrder.managementNumber.includes('_DU측') ? 'DU측' : 'RU측';
  const baseManagementNumber = workOrder.managementNumber.replace(/_DU측|_RU측/g, '');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">현장 회신 메모</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Eye className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              [{workOrder.operationTeam} {workType}]
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">ㅇ 관리번호 :</span> {baseManagementNumber}
              </div>
              <div>
                <span className="font-medium">ㅇ 국사 명 :</span> {workOrder.concentratorName5G}
              </div>
              {workType === 'RU측' && (
                <div>
                  <span className="font-medium">ㅇ 국소 명 :</span> {workOrder.equipmentName}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {workOrder.responseNote?.ruOpticalSignal && (
              <div>
                <span className="font-medium">ㅇ RU 광신호 유/무 :</span> {workOrder.responseNote.ruOpticalSignal}
              </div>
            )}

            {workType === 'DU측' && workOrder.responseNote?.mux5G && (
              <div>
                <span className="font-medium">ㅇ 5G MUX :</span> {workOrder.responseNote.mux5G}
              </div>
            )}

            {workType === 'DU측' && workOrder.responseNote?.tie5GLine && (
              <div>
                <span className="font-medium">ㅇ 5G TIE 선번 :</span> {workOrder.responseNote.tie5GLine}
              </div>
            )}

            <div>
              <span className="font-medium">ㅇ 특이사항 :</span> {workOrder.responseNote?.specialNotes || '없음'}
            </div>

            <div className="text-xs text-gray-500 pt-2 border-t">
              회신 작성일: {workOrder.responseNote?.updatedAt ? new Date(workOrder.responseNote.updatedAt).toLocaleString() : '-'}
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button onClick={onClose} className="btn btn-secondary">
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Board() {
  const { isAdmin } = useAuth();
  const completedResponseNotes = useCompletedResponseNotes();
  const { markResponseNoteAsChecked } = useWorkOrders();
  
  const [selectedTeam, setSelectedTeam] = useState<OperationTeam | ''>('');
  const [showChecked, setShowChecked] = useState<'all' | 'unchecked' | 'checked'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewingDetailId, setViewingDetailId] = useState<string | null>(null);
  const [collapsedTeams, setCollapsedTeams] = useState<Set<OperationTeam>>(new Set());

  // 필터링된 현장 회신 메모
  const filteredNotes = useMemo(() => {
    return completedResponseNotes.filter(workOrder => {
      // 팀 필터
      if (selectedTeam && workOrder.operationTeam !== selectedTeam) {
        return false;
      }
      
      // 확인 상태 필터
      if (showChecked === 'unchecked' && workOrder.responseNote?.adminChecked) {
        return false;
      }
      if (showChecked === 'checked' && !workOrder.responseNote?.adminChecked) {
        return false;
      }
      
      // 검색어 필터
      if (searchTerm.trim()) {
        const search = searchTerm.toLowerCase();
        const searchableFields = [
          workOrder.managementNumber,
          workOrder.equipmentName,
          workOrder.concentratorName5G,
          workOrder.responseNote?.specialNotes || '',
          workOrder.responseNote?.ruOpticalSignal || '',
          workOrder.responseNote?.mux5G || '',
          workOrder.responseNote?.tie5GLine || ''
        ];
        
        if (!searchableFields.some(field => 
          field.toLowerCase().includes(search)
        )) {
          return false;
        }
      }
      
      return true;
    });
  }, [completedResponseNotes, selectedTeam, showChecked, searchTerm]);

  // 팀별로 그룹화
  const notesByTeam = useMemo(() => {
    const grouped: Record<OperationTeam, WorkOrder[]> = {} as Record<OperationTeam, WorkOrder[]>;
    
    filteredNotes.forEach(workOrder => {
      if (!grouped[workOrder.operationTeam]) {
        grouped[workOrder.operationTeam] = [];
      }
      grouped[workOrder.operationTeam].push(workOrder);
    });
    
    // 각 팀별로 최신순 정렬
    Object.keys(grouped).forEach(team => {
      grouped[team as OperationTeam].sort((a, b) => 
        new Date(b.responseNote?.updatedAt || b.completedAt || b.updatedAt).getTime() - 
        new Date(a.responseNote?.updatedAt || a.completedAt || a.updatedAt).getTime()
      );
    });
    
    return grouped;
  }, [filteredNotes]);

  const handleMarkAsChecked = async (workOrderId: string) => {
    await markResponseNoteAsChecked(workOrderId);
  };

  const toggleTeamCollapse = (team: OperationTeam) => {
    const newCollapsed = new Set(collapsedTeams);
    if (newCollapsed.has(team)) {
      newCollapsed.delete(team);
    } else {
      newCollapsed.add(team);
    }
    setCollapsedTeams(newCollapsed);
  };

  const clearFilters = () => {
    setSelectedTeam('');
    setShowChecked('all');
    setSearchTerm('');
  };

  const activeFiltersCount = [selectedTeam, showChecked !== 'all', searchTerm].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">현장 회신 게시판</h1>
              <p className="text-gray-600 mt-1">완료된 작업지시의 현장 회신 메모를 확인하세요</p>
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
                placeholder="관리번호, 장비명, 특이사항 등으로 검색..."
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
                    운용팀
                  </label>
                  <select
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value as OperationTeam | '')}
                    className="input w-full"
                  >
                    <option value="">전체</option>
                    <option value="울산T">울산T</option>
                    <option value="동부산T">동부산T</option>
                    <option value="중부산T">중부산T</option>
                    <option value="서부산T">서부산T</option>
                    <option value="김해T">김해T</option>
                    <option value="창원T">창원T</option>
                    <option value="진주T">진주T</option>
                    <option value="통영T">통영T</option>
                    <option value="지하철T">지하철T</option>
                    <option value="기타">기타</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    확인 상태
                  </label>
                  <select
                    value={showChecked}
                    onChange={(e) => setShowChecked(e.target.value as 'all' | 'unchecked' | 'checked')}
                    className="input w-full"
                  >
                    <option value="all">전체</option>
                    <option value="unchecked">미확인</option>
                    <option value="checked">확인완료</option>
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
            총 {filteredNotes.length}건의 현장 회신 메모
            {activeFiltersCount > 0 && ' (필터링됨)'}
          </div>
          <div className="flex gap-4 text-sm">
            <span className="flex items-center">
              <div className="w-3 h-3 bg-red-400 rounded-full mr-1"></div>
              미확인 {filteredNotes.filter(n => !n.responseNote?.adminChecked).length}
            </span>
            <span className="flex items-center">
              <div className="w-3 h-3 bg-green-400 rounded-full mr-1"></div>
              확인완료 {filteredNotes.filter(n => n.responseNote?.adminChecked).length}
            </span>
          </div>
        </div>

        {/* 메모 리스트 */}
        <div className="space-y-6">
          {Object.keys(notesByTeam).length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                <MessageSquare className="h-12 w-12" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                현장 회신 메모가 없습니다
              </h3>
              <p className="text-gray-600">
                작업이 완료되고 현장 회신 메모가 작성되면 여기에 표시됩니다
              </p>
            </div>
          ) : (
            Object.entries(notesByTeam)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([team, teamNotes]) => {
                const isCollapsed = collapsedTeams.has(team as OperationTeam);
                const uncheckedCount = teamNotes.filter(n => !n.responseNote?.adminChecked).length;
                
                return (
                  <div key={team} className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleTeamCollapse(team as OperationTeam)}
                    >
                      <div className="flex items-center space-x-3">
                        {isCollapsed ? (
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                        <div className="flex items-center space-x-3">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            {team}
                          </span>
                          <span className="text-lg font-semibold text-gray-900">
                            {teamNotes.length}건
                          </span>
                          {uncheckedCount > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              미확인 {uncheckedCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {!isCollapsed && (
                      <div className="border-t border-gray-200">
                        <div className="divide-y divide-gray-100">
                          {teamNotes.map((workOrder) => {
                            const workType = workOrder.managementNumber.includes('_DU측') ? 'DU측' : 'RU측';
                            const baseManagementNumber = workOrder.managementNumber.replace(/_DU측|_RU측/g, '');
                            const isChecked = workOrder.responseNote?.adminChecked;
                            
                            return (
                              <div key={workOrder.id} className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                        {baseManagementNumber}
                                      </span>
                                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                        workType === 'DU측' 
                                          ? 'bg-blue-100 text-blue-800' 
                                          : 'bg-green-100 text-green-800'
                                      }`}>
                                        {workType}
                                      </span>
                                      <span className="text-sm text-gray-500">
                                        {workOrder.concentratorName5G}
                                      </span>
                                      {isChecked && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                          <Check className="w-3 h-3 mr-1" />
                                          확인완료
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div className="text-sm text-gray-700 mb-2">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {workOrder.responseNote?.ruOpticalSignal && (
                                          <div>
                                            <span className="font-medium">RU 광신호:</span> {workOrder.responseNote.ruOpticalSignal}
                                          </div>
                                        )}
                                        {workOrder.responseNote?.specialNotes && (
                                          <div>
                                            <span className="font-medium">특이사항:</span> {workOrder.responseNote.specialNotes}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="text-xs text-gray-500">
                                      작성일: {workOrder.responseNote?.updatedAt ? 
                                        new Date(workOrder.responseNote.updatedAt).toLocaleString() : '-'}
                                      {isChecked && workOrder.responseNote?.adminCheckedAt && (
                                        <span className="ml-4">
                                          확인일: {new Date(workOrder.responseNote.adminCheckedAt).toLocaleString()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 ml-4">
                                    <button
                                      onClick={() => setViewingDetailId(workOrder.id)}
                                      className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md"
                                      title="상세보기"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    {isAdmin && !isChecked && (
                                      <button
                                        onClick={() => handleMarkAsChecked(workOrder.id)}
                                        className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-md"
                                        title="확인완료"
                                      >
                                        <Check className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
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
          workOrder={filteredNotes.find(wo => wo.id === viewingDetailId)!}
          onClose={() => setViewingDetailId(null)}
        />
      )}
    </div>
  );
}