import { useState } from 'react'
import { Clock, User, CheckCircle, Edit3, Trash2, Eye, X, MessageSquare } from 'lucide-react'
import clsx from 'clsx'
import { WorkOrder, WorkOrderStatus, ResponseNote } from '@/types'
import { useWorkOrders } from '@/hooks/useWorkOrders'

interface WorkOrderTableProps {
  workOrders: WorkOrder[]
}

const StatusBadge = ({ status }: { status: WorkOrderStatus }) => {
  const statusConfig = {
    pending: {
      label: '대기',
      icon: Clock,
      className: 'bg-warning-100 text-warning-800'
    },
    in_progress: {
      label: '진행중',
      icon: User,
      className: 'bg-primary-100 text-primary-800'
    },
    completed: {
      label: '완료',
      icon: CheckCircle,
      className: 'bg-success-100 text-success-800'
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

const ResponseNoteModal = ({ workOrder, onClose }: { workOrder: WorkOrder, onClose: () => void }) => {
  const { updateResponseNote } = useWorkOrders()
  const [formData, setFormData] = useState({
    ruOpticalSignal: workOrder.responseNote?.ruOpticalSignal || '',
    mux5G: workOrder.responseNote?.mux5G || '',
    tie5GLine: workOrder.responseNote?.tie5GLine || '',
    specialNotes: workOrder.responseNote?.specialNotes || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const responseNote: Partial<ResponseNote> = {
      ruOpticalSignal: formData.ruOpticalSignal.trim() || undefined,
      mux5G: formData.mux5G.trim() || undefined,  
      tie5GLine: formData.tie5GLine.trim() || undefined,
      specialNotes: formData.specialNotes.trim() || undefined
    }

    updateResponseNote(workOrder.id, responseNote)
    onClose()
  }

  // 관리번호에서 DU/RU 구분 추출
  const workType = workOrder.managementNumber.includes('_DU측') ? 'DU측' : 'RU측'
  const baseManagementNumber = workOrder.managementNumber.replace(/_DU측|_RU측/g, '')

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">현장 회신 메모</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 자동 반영된 정보 */}
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
              {workOrder.coSiteCount5G && (
                <div>
                  <span className="font-medium">ㅇ 5G CO-SITE 수량 :</span> {workOrder.coSiteCount5G}
                </div>
              )}
              
              {/* 여러 RU 정보 표시 */}
              {workOrder.ruInfoList && workOrder.ruInfoList.length > 0 && (
                <div className="mt-3">
                  <span className="font-medium">ㅇ RU 장비 목록 :</span>
                  <div className="mt-2 space-y-1 pl-4">
                    {workOrder.ruInfoList.map((ru, index) => (
                      <div key={index} className="text-xs bg-white p-2 rounded border">
                        <div><strong>RU #{index + 1}:</strong> {ru.ruName}</div>
                        <div className="text-gray-600">ID: {ru.ruId}</div>
                        {ru.channelCard && <div className="text-gray-600">채널카드: {ru.channelCard}</div>}
                        {ru.port && <div className="text-gray-600">포트: {ru.port}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 사용자 입력 필드 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ㅇ RU 광신호 유/무 :
              </label>
              <input
                type="text"
                value={formData.ruOpticalSignal}
                onChange={(e) => setFormData({...formData, ruOpticalSignal: e.target.value})}
                className="input w-full"
                placeholder="유 또는 무"
              />
            </div>

            {workType === 'DU측' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ㅇ 5G MUX :
                  </label>
                  <input
                    type="text"
                    value={formData.mux5G}
                    onChange={(e) => setFormData({...formData, mux5G: e.target.value})}
                    className="input w-full"
                    placeholder="예: 0107B-14S-08"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ㅇ 5G TIE 선번 :
                  </label>
                  <input
                    type="text"
                    value={formData.tie5GLine}
                    onChange={(e) => setFormData({...formData, tie5GLine: e.target.value})}
                    className="input w-full"
                    placeholder="예: 동래-동래5G SF-5003-280"
                  />
                </div>
              </>
            )}

            {workType === 'RU측' && (
              <div>
                <span className="font-medium">ㅇ 국소 명 :</span> {workOrder.equipmentName}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ㅇ 특이사항 :
              </label>
              <textarea
                value={formData.specialNotes}
                onChange={(e) => setFormData({...formData, specialNotes: e.target.value})}
                className="input w-full"
                rows={3}
                placeholder="특이사항이 있으면 입력하세요 (예: 없음)"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              취소
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const WorkOrderDetailModal = ({ workOrder, onClose }: { workOrder: WorkOrder, onClose: () => void }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">작업지시 상세정보</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
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
                <div><span className="font-medium text-gray-700">대표 RU ID:</span> {workOrder.representativeRuId || 'N/A'}</div>
                <div><span className="font-medium text-gray-700">5G Co-Site 수량:</span> {workOrder.coSiteCount5G || 'N/A'}</div>
                <div><span className="font-medium text-gray-700">5G 집중국명:</span> {workOrder.concentratorName5G}</div>
                
                {/* 여러 RU 정보 표시 */}
                {workOrder.ruInfoList && workOrder.ruInfoList.length > 0 && (
                  <div className="mt-4">
                    <span className="font-medium text-gray-700">전체 RU 목록:</span>
                    <div className="mt-2 space-y-2">
                      {workOrder.ruInfoList.map((ru, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="font-medium text-sm">{ru.ruName}</div>
                              <div className="text-xs text-gray-600">ID: {ru.ruId}</div>
                              {ru.channelCard && <div className="text-xs text-gray-600">채널카드: {ru.channelCard}</div>}
                              {ru.port && <div className="text-xs text-gray-600">포트: {ru.port}</div>}
                            </div>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              RU #{index + 1}
                            </span>
                          </div>
                        </div>
                      ))}
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
                <div><span className="font-medium text-gray-700">서비스 구분:</span> {workOrder.serviceType}</div>
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
                <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded mt-1 break-all">
                  {workOrder.notes?.match(/회선번호: ([^,]+)/)?.[1] || 'N/A'}
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">선번장 상세:</span>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="font-mono text-sm break-all">{workOrder.lineNumber}</div>
                </div>
              </div>
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


export default function WorkOrderTable({ workOrders }: WorkOrderTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingStatus, setEditingStatus] = useState<WorkOrderStatus>('pending')
  const [notes, setNotes] = useState('')
  const [viewingDetailId, setViewingDetailId] = useState<string | null>(null)
  const [responseNoteId, setResponseNoteId] = useState<string | null>(null)
  const { updateStatus, deleteWorkOrder } = useWorkOrders()

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
    await updateStatus(id, editingStatus, notes)
    handleEditCancel()
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('이 작업지시를 삭제하시겠습니까?')) {
      await deleteWorkOrder(id)
    }
  }

  if (workOrders.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          작업지시가 없습니다
        </h3>
        <p className="text-gray-600">
          Excel 파일을 업로드하여 작업지시를 등록하세요
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                관리번호
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업요청일
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                운용팀
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                장비 정보
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                DU 정보
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {workOrders.map((workOrder) => (
              <tr key={workOrder.id} className="hover:bg-gray-50">
                <td className="px-4 py-4 text-sm text-gray-900">
                  <div className="font-mono text-xs bg-gray-100 px-2 py-1 rounded max-w-xs break-all">
                    <div className="flex items-center space-x-1">
                      <span>{workOrder.managementNumber.replace(/_DU측|_RU측/g, '')}</span>
                      {workOrder.managementNumber.includes('_DU측') && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          DU
                        </span>
                      )}
                      {workOrder.managementNumber.includes('_RU측') && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          RU
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 min-w-[120px]">
                  <div className="text-sm text-gray-900 break-all">
                    {workOrder.requestDate}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {workOrder.operationTeam}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-900">
                  <div className="space-y-1">
                    <div><strong>장비명:</strong> {workOrder.equipmentName}</div>
                    <div><strong>5G 집중국:</strong> {workOrder.concentratorName5G}</div>
                    <div><strong>구분:</strong> {workOrder.equipmentType}</div>
                    <div><strong>서비스:</strong> {workOrder.serviceType}</div>
                    {workOrder.coSiteCount5G && (
                      <div><strong>CO-SITE 수량:</strong> <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">{workOrder.coSiteCount5G}</span></div>
                    )}
                    {workOrder.ruInfoList && workOrder.ruInfoList.length > 1 && (
                      <div><strong>RU 개수:</strong> <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">{workOrder.ruInfoList.length}개</span></div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-900">
                  <div className="space-y-1">
                    <div><strong>DU ID:</strong> {workOrder.duId}</div>
                    <div><strong>DU 명:</strong> {workOrder.duName}</div>
                    <div><strong>채널카드:</strong> {workOrder.channelCard}</div>
                    <div><strong>포트:</strong> {workOrder.port}</div>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {editingId === workOrder.id ? (
                    <div className="space-y-2">
                      <select
                        value={editingStatus}
                        onChange={(e) => setEditingStatus(e.target.value as WorkOrderStatus)}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="pending">대기</option>
                        <option value="in_progress">진행중</option>
                        <option value="completed">완료</option>
                      </select>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="메모 (선택사항)"
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                        rows={2}
                      />
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleEditSave(workOrder.id)}
                          className="text-xs bg-primary-600 text-white px-2 py-1 rounded hover:bg-primary-700"
                        >
                          저장
                        </button>
                        <button
                          onClick={handleEditCancel}
                          className="text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-400"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <StatusBadge status={workOrder.status} />
                      {workOrder.notes && (
                        <div className="text-xs text-gray-500">
                          {workOrder.notes}
                        </div>
                      )}
                      {workOrder.completedAt && (
                        <div className="text-xs text-gray-500">
                          완료: {new Date(workOrder.completedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {editingId === workOrder.id ? null : (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setViewingDetailId(workOrder.id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="상세보기"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setResponseNoteId(workOrder.id)}
                        className={`hover:text-green-900 ${workOrder.responseNote ? 'text-green-600' : 'text-gray-400'}`}
                        title="현장 회신 메모"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditStart(workOrder)}
                        className="text-primary-600 hover:text-primary-900"
                        title="상태 변경"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(workOrder.id)}
                        className="text-danger-600 hover:text-danger-900"
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
        <ResponseNoteModal
          workOrder={workOrders.find(wo => wo.id === responseNoteId)!}
          onClose={() => setResponseNoteId(null)}
        />
      )}
    </div>
  )
}