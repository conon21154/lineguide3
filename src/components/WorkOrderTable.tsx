import { useState, useEffect } from 'react'
import { Clock, User, CheckCircle, Edit3, Trash2, Eye, X, MessageSquare, CheckCircle2 } from 'lucide-react'
import clsx from 'clsx'
import { WorkOrder, WorkOrderStatus } from '@/types'
import { useWorkOrders } from '@/hooks/useWorkOrders'
import { useWorkOrders as useWorkOrdersAPI } from '@/hooks/useWorkOrdersAPI'
import MemoForm from './MemoForm'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface WorkOrderTableProps {
  workOrders: WorkOrder[]
  onRefresh?: () => Promise<void> | void
  onUpdateStatus?: (id: string, status: WorkOrder['status'], notes?: string) => Promise<{ success: boolean; error?: string }>
  onDeleteWorkOrder?: (id: string) => Promise<{ success: boolean; error?: string }>
}

// 관리번호 접미사 _(DU측|RU측) 제거
const getBaseManagementNumber = (managementNumber?: string) =>
  (managementNumber || '').replace(/_(DU측|RU측)$/g, '')

// 대표 RU명 선택: /(^|[_\s-])(A|32T_A|_A)\b/i 우선, 없으면 첫 RU
const getRepresentativeRuName = (ruInfoList?: { ruName?: string }[]) => {
  if (!ruInfoList || ruInfoList.length === 0) return ''
  const priority = ruInfoList.find(
    ru => ru.ruName && /(^|[_\s-])(A|32T_A|_A)\b/i.test(ru.ruName)
  )
  return (priority?.ruName || ruInfoList[0]?.ruName || '').trim()
}

// 팀 비교 유틸 (공백/제로폭 제거 후 비교)
const normTeam = (t?: string) => (t || '').replace(/\s+/g, '').replace(/\u200B/g, '').trim()
const isSameTeam = (a?: string, b?: string) => normTeam(a) === normTeam(b)

const StatusBadge = ({ status }: { status: WorkOrderStatus }) => {
  const statusConfig = {
    pending: {
      label: '대기',
      icon: Clock,
      className: 'bg-yellow-100 text-yellow-800'
    },
    in_progress: {
      label: '진행중',
      icon: User,
      className: 'bg-[#1E40AF]/10 text-[#1E40AF]'
    },
    completed: {
      label: '완료',
      icon: CheckCircle,
      className: 'bg-green-100 text-green-800'
    }
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', config.className)}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </span>
  )
}

const WorkOrderDetailModal = ({ workOrder, onClose }: { workOrder: WorkOrder, onClose: () => void }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">작업지시 상세정보</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">기본 정보</h3>
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-700">관리번호:</span> 
                  <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded mt-1 break-all">
                    <div className="flex items-center space-x-2">
                      <span>{workOrder.managementNumber.replace(/_DU측|_RU측/g, '')}</span>
                      {workOrder.managementNumber.includes('_DU측') && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          DU측 작업
                        </span>
                      )}
                      {workOrder.managementNumber.includes('_RU측') && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          RU측 작업
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">작업요청일:</span>
                  <div className="text-sm mt-1 break-all">
                    {workOrder.requestDate}
                  </div>
                </div>
                <div><span className="font-medium text-gray-700">운용팀:</span> <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{workOrder.operationTeam}</span></div>
                <div><span className="font-medium text-gray-700">상태:</span> <StatusBadge status={workOrder.status} /></div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">RU 정보</h3>
              <div className="space-y-3">
                {workOrder.representativeRuId && (
                  <div><span className="font-medium text-gray-700">대표 RU ID:</span> {workOrder.representativeRuId}</div>
                )}
                {workOrder.coSiteCount5G && (
                  <div><span className="font-medium text-gray-700">5G Co-Site 수량:</span> {workOrder.coSiteCount5G}</div>
                )}
                {workOrder.concentratorName5G && workOrder.concentratorName5G !== 'N/A' && (
                  <div><span className="font-medium text-gray-700">5G 집중국명:</span> {workOrder.concentratorName5G}</div>
                )}
                
                {/* 여러 RU 정보 표시 */}
                {workOrder.ruInfoList && workOrder.ruInfoList.length > 0 && (
                  <div className="mt-4">
                    <span className="font-medium text-gray-700">전체 RU 목록:</span>
                    <div className="mt-2 space-y-2">
                      {workOrder.ruInfoList.map((ru, index) => {
                        const isRepresentative = ru.ruId === workOrder.representativeRuId;
                        const muxCH = ru.serviceType || workOrder.muxInfo?.['서비스구분'] || workOrder.serviceType;
                        
                        return (
                          <div key={index} className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <div className="font-medium text-sm">{ru.ruName}</div>
                                <div className="text-xs text-gray-600">ID: {ru.ruId}</div>
                                {(ru.channelCard !== undefined && ru.channelCard !== '') && (
                                  <div className="text-xs text-gray-600">채널카드: {ru.channelCard}</div>
                                )}
                                {(ru.port !== undefined && ru.port !== '') && (
                                  <div className="text-xs text-gray-600">포트: {ru.port}</div>
                                )}
                                {muxCH && <div className="text-xs text-blue-600 font-medium">MUX CH: {muxCH}</div>}
                              </div>
                              {isRepresentative ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  대표 A
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                  RU #{index + 1}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">장비 정보</h3>
              <div className="space-y-3">
                <div><span className="font-medium text-gray-700">장비 타입:</span> {workOrder.equipmentType}</div>
                <div><span className="font-medium text-gray-700">장비명:</span> {workOrder.equipmentName}</div>
                <div><span className="font-medium text-gray-700">종류:</span> {workOrder.category}</div>
                <div><span className="font-medium text-gray-700">서비스 위치:</span> {workOrder.serviceLocation}</div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">DU 정보</h3>
              <div className="space-y-3">
                <div><span className="font-medium text-gray-700">DU ID:</span> {workOrder.duId}</div>
                <div><span className="font-medium text-gray-700">DU명:</span> {workOrder.duName}</div>
                <div><span className="font-medium text-gray-700">채널카드:</span> {workOrder.channelCard}</div>
                <div><span className="font-medium text-gray-700">포트:</span> {workOrder.port}</div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">선번장 정보</h3>
            <div className="space-y-3">
              <div>
                <span className="font-medium text-gray-700">회선번호:</span>
                <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded mt-1 whitespace-nowrap tabular-nums">
                  {workOrder.lineNumber}
                </div>
              </div>
              {workOrder.muxInfo && (
                <div>
                  <span className="font-medium text-gray-700">LTE MUX/국간,간선망:</span>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="font-mono text-sm break-all">{workOrder.muxInfo.lteMux}</div>
                    {workOrder.muxInfo.muxType && (
                      <div className="text-xs text-gray-600 mt-1">MUX종류: {workOrder.muxInfo.muxType}</div>
                    )}
                    {workOrder.muxInfo.서비스구분 && (
                      <div className="text-xs text-blue-600 mt-1 font-medium">
                        서비스구분: {workOrder.muxInfo.서비스구분}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {workOrder.notes && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">메모</h3>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-sm">{workOrder.notes}</div>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">시간 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div><span className="font-medium">생성일:</span> {new Date(workOrder.createdAt).toLocaleString()}</div>
              <div><span className="font-medium">수정일:</span> {new Date(workOrder.updatedAt).toLocaleString()}</div>
              {workOrder.completedAt && (
                <div><span className="font-medium">완료일:</span> {new Date(workOrder.completedAt).toLocaleString()}</div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

export default function WorkOrderTable({ workOrders, onRefresh, onUpdateStatus, onDeleteWorkOrder }: WorkOrderTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingStatus, setEditingStatus] = useState<WorkOrderStatus>('pending')
  const [notes, setNotes] = useState('')
  const [viewingDetailId, setViewingDetailId] = useState<string | null>(null)
  const [responseNoteId, setResponseNoteId] = useState<string | null>(null)
  
  // 상위에서 전달받은 함수들 사용 (낙관적 업데이트를 위해)
  const updateStatusFn = onUpdateStatus || (() => Promise.resolve({ success: false, error: '함수가 전달되지 않음' }))
  const deleteWorkOrderFn = onDeleteWorkOrder || (() => Promise.resolve({ success: false, error: '함수가 전달되지 않음' }))

  const handleEditStart = (workOrder: WorkOrder) => {
    setEditingId(workOrder.id)
    setEditingStatus(workOrder.status)
    setNotes(workOrder.notes || '')
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditingStatus('pending')
    setNotes('')
  }

  const handleEditSave = async (id: string) => {
    try {
      await updateStatusFn(id, editingStatus, notes)
      setEditingId(null)
      setEditingStatus('pending')
      setNotes('')
    } catch (error) {
      console.error('상태 업데이트 오류:', error)
      alert('상태 업데이트 중 오류가 발생했습니다.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('이 작업지시를 삭제하시겠습니까?')) return

    try {
      await deleteWorkOrderFn(id)
    } catch (error) {
      console.error('삭제 오류:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const isCompleted = (status: WorkOrderStatus) => status === 'completed' || status === '확인완료' as any;

  return (
    <div className="space-y-4">
      {/* 모바일 카드 뷰 */}
      <div className="block lg:hidden space-y-3 overflow-x-hidden">
        {workOrders.map((workOrder) => (
          <Card key={workOrder.id} className="p-3 space-y-2">
            {/* 상단: 관리번호 + 상태 배지 */}
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-900 min-w-0">
                  <span className="block truncate" title={getBaseManagementNumber(workOrder.managementNumber)}>
                    {getBaseManagementNumber(workOrder.managementNumber)}
                  </span>
                </div>
                {workOrder.workType && (
                  <div className="mt-1">
                    <span className={`inline-flex items-center h-6 px-2 rounded-md text-xs shrink-0 font-medium ${
                      workOrder.workType === 'DU측' 
                        ? 'bg-[#1E40AF]/10 text-[#1E40AF]' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {workOrder.workType}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-shrink-0">
                {editingId === workOrder.id ? (
                  <div className="space-y-2">
                    <select
                      value={editingStatus}
                      onChange={(e) => setEditingStatus(e.target.value as WorkOrderStatus)}
                      className="text-xs border rounded p-1"
                    >
                      <option value="pending">대기</option>
                      <option value="in_progress">진행중</option>
                      <option value="completed">완료</option>
                    </select>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="메모 (선택사항)"
                      className="w-full text-xs border rounded p-2"
                      rows={2}
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditSave(workOrder.id)}
                        className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                      >
                        저장
                      </button>
                      <button
                        onClick={handleEditCancel}
                        className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <StatusBadge status={workOrder.status} />
                )}
              </div>
            </div>
            
            {/* 본문: 팀, 장비명, 대표 RU */}
            <div className="grid grid-cols-1 gap-1 text-[13px] text-slate-700">
              <div className="min-w-0">
                <span className="font-medium">팀: </span>
                <span className="truncate" title={workOrder.operationTeam}>{workOrder.operationTeam}</span>
              </div>
              <div className="min-w-0">
                <span className="font-medium">장비명: </span>
                <span className="block truncate" title={workOrder.equipmentName}>{workOrder.equipmentName}</span>
              </div>
              <div className="min-w-0">
                <span className="font-medium">대표 RU: </span>
                <span className="block truncate" title={getRepresentativeRuName(workOrder.ruInfoList) || workOrder.representativeRuId || '-'}>
                  {getRepresentativeRuName(workOrder.ruInfoList) || workOrder.representativeRuId || '-'}
                </span>
              </div>
            </div>
            
            {/* 회신 메모 버튼 */}
            <div>
              <button
                onClick={() => setResponseNoteId(workOrder.id)}
                disabled={!isCompleted(workOrder.status)}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-xs rounded-md transition-colors border ${
                  !isCompleted(workOrder.status)
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
                    : workOrder.hasMemo
                      ? 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200'
                      : 'bg-[#1E40AF]/10 text-[#1E40AF] hover:bg-[#1E40AF]/20 border-[#1E40AF]/20'
                }`}
              >
                {workOrder.hasMemo ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <MessageSquare className="w-4 h-4" />
                )}
                <span>{!isCompleted(workOrder.status) ? '작성 불가' : (workOrder.hasMemo ? '메모 완료' : '메모 작성')}</span>
              </button>
            </div>
            
            {/* 액션 버튼들 */}
            {editingId !== workOrder.id && (
              <div className="flex justify-end gap-1 pt-1">
                <button
                  onClick={() => setViewingDetailId(workOrder.id)}
                  className="w-9 h-9 rounded-md hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-[#1E40AF]/30 flex items-center justify-center text-[#1E40AF]"
                  title="상세보기"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleEditStart(workOrder)}
                  className="w-9 h-9 rounded-md hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-[#1E40AF]/30 flex items-center justify-center text-[#1E40AF]"
                  title="상태 변경"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(workOrder.id)}
                  className="w-9 h-9 rounded-md hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-red-500/30 flex items-center justify-center text-red-600"
                  title="삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </Card>
        ))}
      </div>
      
      {/* 데스크톱 테이블 뷰 */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">관리번호</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">팀</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">장비명</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">대표 RU</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">상태</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">회신 메모</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">액션</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {workOrders.map((workOrder) => (
              <tr key={workOrder.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="text-sm font-mono">
                    <div className="font-medium text-slate-900">
                      {getBaseManagementNumber(workOrder.managementNumber)}
                    </div>
                    {workOrder.workType && (
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                        workOrder.workType === 'DU측' 
                          ? 'bg-[#1E40AF]/10 text-[#1E40AF]' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {workOrder.workType}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-900">{workOrder.operationTeam}</td>
                <td className="px-4 py-3 text-sm text-slate-900">{workOrder.equipmentName}</td>
                <td className="px-4 py-3 text-sm text-slate-500">
                  {getRepresentativeRuName(workOrder.ruInfoList) || workOrder.representativeRuId || '-'}
                </td>
                <td className="px-4 py-3">
                  {editingId === workOrder.id ? (
                    <div className="space-y-2">
                      <select
                        value={editingStatus}
                        onChange={(e) => setEditingStatus(e.target.value as WorkOrderStatus)}
                        className="text-sm border rounded p-1"
                      >
                        <option value="pending">대기</option>
                        <option value="in_progress">진행중</option>
                        <option value="completed">완료</option>
                      </select>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="메모 (선택사항)"
                        className="w-full text-sm border rounded p-2"
                        rows={2}
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditSave(workOrder.id)}
                          className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                        >
                          저장
                        </button>
                        <button
                          onClick={handleEditCancel}
                          className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <StatusBadge status={workOrder.status} />
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setResponseNoteId(workOrder.id)}
                    disabled={!isCompleted(workOrder.status)}
                    aria-label={workOrder.hasMemo ? '메모 작성완료' : (isCompleted(workOrder.status) ? '메모 작성' : '작성 불가')}
                    className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors border ${
                      !isCompleted(workOrder.status)
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
                        : workOrder.hasMemo
                          ? 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200'
                          : 'bg-[#1E40AF]/10 text-[#1E40AF] hover:bg-[#1E40AF]/20 border-[#1E40AF]/20'
                    }`}
                    title={!isCompleted(workOrder.status)
                      ? '완료된 작업만 회신 메모 작성 가능'
                      : (workOrder.hasMemo ? '메모가 작성되어 있습니다' : '회신 메모 작성')}
                  >
                    {workOrder.hasMemo ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <MessageSquare className="w-4 h-4" />
                    )}
                    <span>{!isCompleted(workOrder.status) ? '작성 불가' : (workOrder.hasMemo ? '메모 작성완료' : '메모 작성')}</span>
                  </button>
                </td>
                <td className="px-4 py-3">
                  {editingId === workOrder.id ? null : (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setViewingDetailId(workOrder.id)}
                        className="text-[#1E40AF] hover:text-[#1E3A8A]"
                        title="상세보기"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditStart(workOrder)}
                        className="text-[#1E40AF] hover:text-[#1E3A8A]"
                        title="상태 변경"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(workOrder.id)}
                        className="text-red-600 hover:text-red-800"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {viewingDetailId && (
        <WorkOrderDetailModal
          workOrder={workOrders.find(wo => wo.id === viewingDetailId)!}
          onClose={() => setViewingDetailId(null)}
        />
      )}

      {responseNoteId && (
        <MemoForm
          workOrderId={parseInt(responseNoteId)}
          onClose={() => setResponseNoteId(null)}
          onSuccess={() => {
            setResponseNoteId(null);
            // 저장 직후 즉시 반영: 상위에서 내려준 refresh 사용
            if (onRefresh) {
              Promise.resolve(onRefresh());
            }
          }}
        />
      )}
    </div>
  )
}