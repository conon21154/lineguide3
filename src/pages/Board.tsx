import { useState, useMemo, useEffect } from 'react';
import { Eye, MessageSquare, Check, Filter, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { useWorkOrders as useWorkOrdersAPI } from '@/hooks/useWorkOrdersAPI';
import { OperationTeam, FieldReport } from '@/types';
// import { useAuth } from '../contexts/AuthContext';

const FieldReportViewModal = ({ report, onClose }: { report: FieldReport, onClose: () => void }) => {
  const workType = report.workType || 'RU측';
  const baseManagementNumber = report.managementNumber;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">현장 회신 요약</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Eye className="h-6 w-6" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="text-sm text-gray-700 break-words">{report.summary}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
            <div><span className="font-medium">관리번호:</span> {baseManagementNumber}</div>
            <div><span className="font-medium">작업구분:</span> {workType}</div>
            <div><span className="font-medium">운용팀:</span> {report.operationTeam}</div>
            {report.representativeRuId && (
              <div><span className="font-medium">대표 RU ID:</span> {report.representativeRuId}</div>
            )}
          </div>
          <div className="text-xs text-gray-500">작성일: {new Date(report.createdAt).toLocaleString()}</div>
          <div className="flex justify-end pt-4">
            <button onClick={onClose} className="btn btn-secondary">닫기</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Board() {
  const { fetchFieldReports, toggleFieldReportChecked } = useWorkOrdersAPI();
  const [reports, setReports] = useState<FieldReport[]>([]);
  
  const [selectedTeam, setSelectedTeam] = useState<OperationTeam | ''>('');
  const [showChecked, setShowChecked] = useState<'all' | 'unchecked' | 'checked'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewingDetailId, setViewingDetailId] = useState<string | null>(null);
  const [collapsedTeams, setCollapsedTeams] = useState<Set<OperationTeam>>(new Set());

  useEffect(() => {
    (async () => {
      const data = await fetchFieldReports();
      // createdAt DESC 2차 정렬 보강
      const sorted = [...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setReports(sorted);
    })();
  }, []);

  // 필터링된 현장 회신 메모 (FieldReport 기준)
  const filteredNotes = useMemo(() => {
    return reports.filter(report => {
      // 팀 필터
      if (selectedTeam && report.operationTeam !== selectedTeam) {
        return false;
      }
      
      // 확인 상태 필터
      // 서버에서 확인 여부가 오지 않는 스펙이므로 필터는 전체 유지
      if (showChecked !== 'all') {
        // no-op: 필요 시 확장
      }
      
      // 검색어 필터
      if (searchTerm.trim()) {
        const search = searchTerm.toLowerCase();
        const searchableFields = [
          report.summary,
          report.managementNumber,
          report.operationTeam,
          report.workType,
          report.equipmentName || '',
          report.representativeRuId || ''
        ];
        
        if (!searchableFields.some(field => 
          field.toLowerCase().includes(search)
        )) {
          return false;
        }
      }
      
      return true;
    });
  }, [reports, selectedTeam, showChecked, searchTerm]);

  // 팀별로 그룹화
  const notesByTeam = useMemo(() => {
    const grouped: Record<string, FieldReport[]> = {};
    
    filteredNotes.forEach(report => {
      if (!grouped[report.operationTeam]) {
        grouped[report.operationTeam] = [];
      }
      grouped[report.operationTeam].push(report);
    });
    
    // 각 팀별로 최신순 정렬
    Object.keys(grouped).forEach(team => {
      grouped[team].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
    
    return grouped;
  }, [filteredNotes]);

  // 확인완료 기능은 서버 스펙 정립 후 처리 예정

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
          <div className="flex gap-4 text-sm" />
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
                const uncheckedCount = 0;
                
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
                          {teamNotes.map((report) => {
                            const workType = report.workType || 'RU측';
                            const baseManagementNumber = report.managementNumber;
                            const isChecked = (report as any).adminChecked === true;
                            
                            return (
                              <div key={report.id} className="p-4">
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
                                        {report.equipmentName}
                                      </span>
                                      {isChecked && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                          <Check className="w-3 h-3 mr-1" />
                                          확인완료
                                        </span>
                                      )}
                                    </div>
                                    
                                    {report.representativeRuId && (
                                      <div className="text-xs text-gray-600 mb-1">
                                        <span className="font-medium">대표 RU ID:</span> {report.representativeRuId}
                                      </div>
                                    )}

                                    <div className="text-sm text-gray-700 mb-2 line-clamp-3">{report.summary}</div>
                                    
                                    <div className="text-xs text-gray-500">
                                      작성일: {new Date(report.createdAt).toLocaleString()}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 ml-4">
                                    <button
                                      onClick={() => setViewingDetailId(report.id)}
                                      className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md"
                                      title="상세보기"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={async () => {
                                        const ok = await toggleFieldReportChecked(report.id, !isChecked)
                                        if (ok.success) {
                                          // 낙관적 UI 업데이트
                                          report = { ...(report as any), adminChecked: !isChecked } as any
                                          setViewingDetailId(null)
                                        } else {
                                          alert('확인 처리 중 오류: ' + ok.error)
                                        }
                                      }}
                                      className={`p-2 rounded-md ${isChecked ? 'text-green-700 hover:bg-green-50' : 'text-gray-500 hover:bg-gray-50'}`}
                                      title={isChecked ? '확인 취소' : '확인완료'}
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
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
        <FieldReportViewModal
          report={filteredNotes.find(r => r.id === viewingDetailId)!}
          onClose={() => setViewingDetailId(null)}
        />
      )}
    </div>
  );
}