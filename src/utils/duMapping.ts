import { DuMappingData, WorkOrder, LabelPrintData } from '@/types'

// CSV 데이터를 파싱하여 DU 매핑 데이터로 변환
export const parseDuMappingCSV = (csvContent: string): DuMappingData[] => {
  console.log('📄 원본 CSV 내용 (처음 500자):', csvContent.substring(0, 500))
  
  const lines = csvContent.trim().split('\n')
  const mappingData: DuMappingData[] = []
  
  lines.forEach((line, index) => {
    // 빈 라인 스킵
    if (!line.trim()) return
    
    // 첫 번째 라인이 헤더인지 확인 (DU, BAY, FDF 등이 포함되어 있으면)
    if (index === 0 && (line.includes('DU') || line.includes('BAY') || line.includes('FDF'))) {
      console.log('📋 헤더 라인 발견:', line)
      return
    }
    
    const [duName, bay, fdf] = line.split(',').map(cell => cell.trim().replace(/"/g, ''))
    
    console.log(`📊 라인 ${index}: "${duName}" | "${bay}" | "${fdf}"`)
    
    if (duName && bay && fdf) {
      mappingData.push({
        duName,
        bay,
        fdf
      })
    }
  })
  
  console.log('✅ 파싱 완료:', mappingData.length, '개 데이터')
  console.log('🔍 처음 5개 데이터:', mappingData.slice(0, 5))
  
  return mappingData
}

// DU명 매핑 함수 - 작업지시의 DU명을 CSV의 DU명과 매칭
export const findDuMapping = (workOrderDuName: string, mappingData: DuMappingData[]): DuMappingData | null => {
  console.log('🔍 DU 매핑 시도:', workOrderDuName)
  console.log('📋 CSV 데이터:', mappingData.map(item => item.duName))
  
  // 직접 매칭 시도
  const directMatch = mappingData.find(item => item.duName === workOrderDuName)
  if (directMatch) {
    console.log('✅ 직접 매칭 성공:', directMatch)
    return directMatch
  }
  
  // 부분 매칭 시도 (예: "청맥병원 동부산-09-04(5G)" -> "동부산-09-04(5G)")
  const normalizedWorkOrderDuName = normalizeForMatching(workOrderDuName)
  console.log('🔄 정규화된 작업지시 DU명:', normalizedWorkOrderDuName)
  
  const partialMatch = mappingData.find(item => {
    const normalizedMappingDuName = normalizeForMatching(item.duName)
    console.log(`🔍 비교: "${normalizedMappingDuName}" vs "${normalizedWorkOrderDuName}"`)
    return normalizedMappingDuName === normalizedWorkOrderDuName
  })
  
  if (partialMatch) {
    console.log('✅ 부분 매칭 성공:', partialMatch)
  } else {
    console.log('❌ 매칭 실패')
  }
  
  return partialMatch || null
}

// DU명 정규화 함수 - 매칭을 위한 표준화
const normalizeForMatching = (duName: string): string => {
  console.log('🔧 정규화 전:', duName)
  
  const normalized = duName
    .replace(/^[가-힣]+병원\s+/g, '')    // 병원명 제거 (예: "청맥병원 " 제거)
    .replace(/^[가-힣]+\s+/g, '')       // 기타 한글 이름 제거 (예: "청맥 " 제거)
    .replace(/망\([^)]*\)/g, '')        // "망(안)", "망(내)" 등 제거
    .replace(/R\d*\([^)]*\)/g, '')      // "R2(분기)" 등 제거
    .replace(/T\d*/g, '')               // "T", "T1" 등 제거
    .replace(/\s+/g, '')                // 공백 제거
    .toLowerCase()
  
  console.log('🔧 정규화 후:', normalized)
  return normalized
}

// 장비ID 파싱 함수 - 작업지시에서 장비ID 추출
export const parseEquipmentId = (workOrder: WorkOrder): string => {
  // representativeRuId 또는 duId에서 장비ID 추출
  return workOrder.representativeRuId || workOrder.duId || ''
}

// DU명 포맷팅 함수 - 라벨 출력용 포맷으로 변환
export const formatDuNameForLabel = (workOrder: WorkOrder): string => {
  const { duName, channelCard, port } = workOrder
  
  // DU명에서 채널카드와 포트 정보를 추가
  return `${duName}-${channelCard}-${port}`
}

// 라벨 출력용 데이터 생성
export const createLabelPrintData = (
  workOrder: WorkOrder, 
  mappingData: DuMappingData[], 
  mux5GInfo?: string
): LabelPrintData | null => {
  const duMapping = findDuMapping(workOrder.duName, mappingData)
  if (!duMapping) return null
  
  const equipmentId = parseEquipmentId(workOrder)
  const formattedDuName = formatDuNameForLabel(workOrder)
  
  return {
    equipmentId: equipmentId.toUpperCase(),
    duName: formattedDuName,
    channelCard: workOrder.channelCard,
    port: workOrder.port,
    bay: duMapping.bay,
    fdf: duMapping.fdf,
    equipmentName: workOrder.equipmentName,
    mux5GInfo
  }
}

// 1열 포맷팅 함수 - "NPPS03608S (녹산R2(분기)-01-03(5G)-1-10)"
export const formatFirstLine = (labelData: LabelPrintData): string => {
  return `${labelData.equipmentId} (${labelData.duName})`
}

// 2열 포맷팅 함수 - "장비명 + 5G MUX 정보"  
export const formatSecondLine = (labelData: LabelPrintData): string => {
  const parts = [labelData.equipmentName]
  if (labelData.mux5GInfo) {
    parts.push(labelData.mux5GInfo)
  }
  return parts.join(' + ')
}