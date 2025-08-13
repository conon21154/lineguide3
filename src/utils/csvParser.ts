import { ExcelParseResult, OperationTeam, ExtractedWorkOrderData, WorkOrder, RuInfo } from '@/types';
import { normalizeCircuit } from '@/utils/telecom';

const OPERATION_TEAMS: OperationTeam[] = [
  '울산T',
  '동부산T',
  '중부산T',
  '서부산T',
  '김해T',
  '창원T',
  '진주T',
  '통영T',
  '지하철T',
  '기타'
];

function normalizeOperationTeam(value: string): OperationTeam {
  const normalized = value.trim();
  
  // 직접 매치
  if (OPERATION_TEAMS.includes(normalized as OperationTeam)) {
    return normalized as OperationTeam;
  }
  
  // 부분 매치
  if (normalized.includes('울산')) return '울산T';
  if (normalized.includes('동부산')) return '동부산T';
  if (normalized.includes('중부산')) return '중부산T';
  if (normalized.includes('서부산')) return '서부산T';
  if (normalized.includes('김해')) return '김해T';
  if (normalized.includes('창원')) return '창원T';
  if (normalized.includes('진주')) return '진주T';
  if (normalized.includes('통영')) return '통영T';
  if (normalized.includes('지하철')) return '지하철T';
  
  return '기타';
}

// 실제 CSV 파일 헤더에 맞는 정확한 매핑 (사용자 요청 기준)
const CSV_HEADER_MAPPING = {
  'managementNumber': ['관리번호'],
  'requestDate': ['요청일'],
  'duTeam': ['DU운용팀'],
  'duOwner': ['DU담당자'],
  'ruTeam': ['RU운용팀'],
  'ruOwner': ['RU 담당자', 'RU담당자'],
  'workCategory': ['구분'],
  'ruId': ['RU_ID'],
  'ruName': ['RU_명', 'RU명'],
  'coSiteCount5g': ['co-SITE 수량', 'co-SITE수량'],
  'focus5gName': ['5G 집중국명', '5G집중국명'],
  'vendor1': ['협력사'],
  'vendor2': ['협력사'],
  'lineNumber': ['회선번호'],
  'lteMuxInfo': ['(LTE MUX / 국간,간선망)', 'LTE MUX / 국간,간선망', 'LTE MUX'],
  'muxTypeMain': ['MUX종류'],
  'sido': ['시/도'],
  'sigungu': ['시/군/구'],
  'eupMyeonDong': ['읍/면/동(리)'],
  'beonji': ['번지'],
  'buildingName': ['건물명'],
  'equipmentLocation': ['장비위치'],
  'remark': ['비고'],
  'muxBranch': ['MUX분출여부'],
  'muxTypeSub': ['MUX종류'],
  'serviceType': ['서비스구분'],
  'duId': ['DUID'],
  'duName': ['DU명'],
  'channelCard': ['채널카드'],
  'port': ['포트']
};

// CSV 문자열을 파싱하여 2차원 배열로 변환
function parseCSVContent(csvContent: string): string[][] {
  const lines = csvContent.trim().split('\n');
  const result: string[][] = [];
  
  for (const line of lines) {
    // 간단한 CSV 파싱 (따옴표 처리 포함)
    const row: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    row.push(current.trim());
    result.push(row);
  }
  
  return result;
}

// 헤더 매핑 찾기 (더 정확한 매칭)
function findHeaderMapping(headers: string[]): { [key: string]: number } {
  const mapping: { [key: string]: number } = {};
  
  console.log('🔍 실제 CSV 헤더:', headers);
  
  for (const [fieldName, patterns] of Object.entries(CSV_HEADER_MAPPING)) {
    const headerIndex = headers.findIndex(header => {
      const normalizedHeader = header.trim();
      return patterns.some(pattern => {
        // 정확한 매칭 우선
        if (normalizedHeader === pattern) {
          return true;
        }
        // 부분 매칭 (대소문자 무시)
        return normalizedHeader.toLowerCase() === pattern.toLowerCase();
      });
    });
    
    if (headerIndex !== -1) {
      mapping[fieldName] = headerIndex;
      console.log(`✓ ${fieldName} -> 인덱스 ${headerIndex} (${headers[headerIndex]})`);
    } else {
      console.log(`✗ ${fieldName} 헤더를 찾을 수 없음`);
    }
  }
  
  console.log('📋 최종 CSV 헤더 매핑:', mapping);
  return mapping;
}

// 안전한 값 변환
function safeValue(value: string): string {
  if (!value || value.trim() === '') {
    return 'N/A';
  }
  return value.trim();
}

// CSV 행을 작업지시 데이터로 변환
function parseCSVRow(row: string[], headerMapping: { [key: string]: number }): ExtractedWorkOrderData[] {
  console.log('🔍 CSV 행 파싱:', row);
  
  // RU명 디버깅
  const ruNameIndex = headerMapping['ruName'];
  const ruNameValue = row[ruNameIndex];
  console.log(`🔍 RU명 - 인덱스: ${ruNameIndex}, 원본값: "${ruNameValue}"`);
  
  // 서비스 구분 디버깅
  const serviceTypeIndex = headerMapping['serviceType'];
  const serviceTypeValue = row[serviceTypeIndex];
  console.log(`🔍 서비스 구분 - 인덱스: ${serviceTypeIndex}, 원본값: "${serviceTypeValue}"`);
  
  // 위치 정보 조합
  const locationParts = [
    safeValue(row[headerMapping['sido']]),
    safeValue(row[headerMapping['sigungu']]),
    safeValue(row[headerMapping['eupMyeonDong']]),
    safeValue(row[headerMapping['beonji']])
  ].filter(part => part !== 'N/A');
  const fullAddress = locationParts.join(' ');
  
  const baseData = {
    관리번호: safeValue(row[headerMapping['managementNumber']]),
    작업요청일: safeValue(row[headerMapping['requestDate']]),
    대표_RU_ID: safeValue(row[headerMapping['ruId']]),
    대표_RU_명: safeValue(row[headerMapping['ruName']]),
    "5G_Co_Site_수량": safeValue(row[headerMapping['coSiteCount5g']]),
    "5G_집중국명": safeValue(row[headerMapping['focus5gName']]),
    회선번호: (() => {
      const raw = row[headerMapping['lineNumber']];
      const normalized = normalizeCircuit(raw);
      console.log(`🔍 회선번호 정규화: "${raw}" -> "${normalized}"`);
      return normalized;
    })(),
    선번장: safeValue(row[headerMapping['lteMuxInfo']]),
    종류: safeValue(row[headerMapping['muxTypeMain']]),
    서비스_구분: safeValue(serviceTypeValue),
    DU_ID: safeValue(row[headerMapping['duId']]),
    DU_명: safeValue(row[headerMapping['duName']]), // 실제 DU명
    채널카드: safeValue(row[headerMapping['channelCard']]), // 실제 채널카드 번호
    포트_A: safeValue(row[headerMapping['port']]),
    구분: safeValue(row[headerMapping['workCategory']]),
    협력사: safeValue(row[headerMapping['vendor1']]),
    협력사2: safeValue(row[headerMapping['vendor2']]),
    건물명: safeValue(row[headerMapping['buildingName']]),
    장비위치: safeValue(row[headerMapping['equipmentLocation']]),
    주소: fullAddress,
    비고: safeValue(row[headerMapping['remark']]),
    DU담당자: safeValue(row[headerMapping['duOwner']]),
    RU담당자: safeValue(row[headerMapping['ruOwner']]),
    MUX분출여부: safeValue(row[headerMapping['muxBranch']]),
    MUX종류2: safeValue(row[headerMapping['muxTypeSub']])
  };
  
  const duTeam = normalizeOperationTeam(safeValue(row[headerMapping['duTeam']]));
  const ruTeam = normalizeOperationTeam(safeValue(row[headerMapping['ruTeam']]));
  
  const result: ExtractedWorkOrderData[] = [];
  
  // 1. DU측 작업 생성 (항상 1개)
  result.push({
    ...baseData,
    작업구분: 'DU측',
    DU측_운용팀: duTeam,
    RU측_운용팀: ruTeam
  });
  
  // 2. RU측 작업 생성 (co-site 수량만큼 생성)
  const coSiteCount = parseInt(safeValue(row[headerMapping['coSiteCount5g']])) || 1;
  console.log(`🔍 Co-Site 수량: ${coSiteCount}, RU 작업 ${coSiteCount}개 생성`);
  
  for (let i = 1; i <= coSiteCount; i++) {
    result.push({
      ...baseData,
      작업구분: 'RU측',
      DU측_운용팀: duTeam,
      RU측_운용팀: ruTeam,
      // RU 작업별 고유 식별을 위한 추가 정보
      대표_RU_ID: safeValue(row[headerMapping['ruId']]),
      대표_RU_명: safeValue(row[headerMapping['ruName']]),
      비고: coSiteCount > 1 ? `${safeValue(row[headerMapping['remark']])} (RU 작업 ${i}/${coSiteCount})` : safeValue(row[headerMapping['remark']])
    });
  }
  
  console.log(`✅ 총 ${result.length}개 작업 생성 (DU: 1개, RU: ${coSiteCount}개)`);
  return result;
}

// CSV 파일 파싱 메인 함수
export function parseCSVFile(file: File): Promise<ExcelParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const csvContent = e.target?.result as string;
        console.log('📄 CSV 내용 (처음 500자):', csvContent.substring(0, 500));
        
        const rows = parseCSVContent(csvContent);
        
        if (rows.length < 2) {
          resolve({
            success: false,
            data: [],
            errors: ['CSV 파일이 올바른 형식이 아닙니다. 최소 헤더와 데이터 행이 필요합니다.']
          });
          return;
        }
        
        // 첫 번째 행을 헤더로 사용
        const headers = rows[0];
        const headerMapping = findHeaderMapping(headers);
        
        // 필수 헤더 확인
        const requiredFields = Object.keys(CSV_HEADER_MAPPING);
        const missingFields = requiredFields.filter(field => headerMapping[field] === undefined);
        
        if (missingFields.length > 0) {
          console.warn('⚠️ 누락된 헤더:', missingFields);
        }
        
        const parsedData: ExtractedWorkOrderData[] = [];
        const errors: string[] = [];
        
        // 데이터 행 처리 (헤더 제외)
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          
          // 빈 행 스킵
          if (row.every(cell => !cell || cell.trim() === '')) {
            continue;
          }
          
          try {
            const workOrders = parseCSVRow(row, headerMapping);
            
            for (const workOrder of workOrders) {
              const hasValidData = workOrder.관리번호 !== 'N/A' || 
                                   workOrder.DU_ID !== 'N/A' || 
                                   workOrder.작업요청일 !== 'N/A';
              
              if (hasValidData) {
                parsedData.push(workOrder);
              }
            }
          } catch (error) {
            errors.push(`${i + 1}행: 데이터 파싱 오류 - ${error}`);
          }
        }
        
        console.log('✅ CSV 파싱 완료:', parsedData.length, '개 작업지시');
        
        resolve({
          success: errors.length === 0 || parsedData.length > 0,
          data: parsedData,
          errors
        });
        
      } catch (error) {
        resolve({
          success: false,
          data: [],
          errors: ['CSV 파일 파싱 오류: ' + error]
        });
      }
    };
    
    reader.onerror = () => {
      resolve({
        success: false,
        data: [],
        errors: ['파일을 읽을 수 없습니다.']
      });
    };
    
    // CSV 파일이 EUC-KR 인코딩일 가능성이 높으므로 먼저 EUC-KR로 시도
    // 하지만 브라우저에서 EUC-KR 직접 지원이 제한적이므로 UTF-8 fallback 사용
    try {
      reader.readAsText(file, 'EUC-KR');
    } catch (error) {
      console.warn('EUC-KR 읽기 실패, UTF-8로 재시도:', error);
      reader.readAsText(file, 'UTF-8');
    }
  });
}

// 기존 변환 함수 재사용
function groupByManagementNumber(extractedData: ExtractedWorkOrderData[]): ExtractedWorkOrderData[][] {
  const groups: { [key: string]: ExtractedWorkOrderData[] } = {};
  
  for (const item of extractedData) {
    const key = `${item.관리번호}_${item.작업구분}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
  }
  
  return Object.values(groups);
}

export function convertCSVToWorkOrderFormat(extractedData: ExtractedWorkOrderData[]): Omit<WorkOrder, 'id' | 'status' | 'createdAt' | 'updatedAt'>[] {
  const groupedData = groupByManagementNumber(extractedData);
  
  return groupedData.map(group => {
    const firstItem = group[0];
    
    const ruInfoList: RuInfo[] = group.map(item => ({
      ruId: item.대표_RU_ID,
      ruName: item.대표_RU_명,
      channelCard: item.채널카드,
      port: item.포트_A
    }));
    
    // MUX 정보 구성 (칼럼 15번: LTE MUX, 칼럼 24번: MUX분출여부, 칼럼 25번: MUX종류2, 칼럼 26번: 서비스구분)
    const muxInfo = {
      lteMux: firstItem.선번장,              // 칼럼 15번: (LTE MUX / 국간,간선망)
      muxSplitStatus: firstItem.MUX분출여부, // 칼럼 24번: MUX분출여부
      muxType: firstItem.MUX종류2,           // 칼럼 25번: MUX종류2
      서비스구분: firstItem.서비스_구분      // 칼럼 26번: 서비스구분
    };
    
    return {
      managementNumber: firstItem.관리번호,  // 관리번호는 원본 그대로 유지
      requestDate: firstItem.작업요청일,
      workType: firstItem.작업구분 as 'DU측' | 'RU측',  // 작업구분 추가
      operationTeam: firstItem.DU측_운용팀,  // DU측 운용팀
      ruOperationTeam: firstItem.RU측_운용팀, // RU측 운용팀
      representativeRuId: firstItem.대표_RU_ID,
      coSiteCount5G: firstItem['5G_Co_Site_수량'],
      concentratorName5G: firstItem['5G_집중국명'],  // 5G 집중국명
      equipmentType: firstItem.구분 || '5G 장비',     // 구분
      equipmentName: firstItem.대표_RU_명,            // RU명을 장비명으로 사용
      category: firstItem.구분,                       // 구분을 카테고리로 사용
      serviceType: firstItem.서비스_구분,             // 서비스구분 (CH4, CH5, CH6 등)
      duId: firstItem.DU_ID,
      duName: firstItem.DU_명,
      channelCard: firstItem.채널카드,
      port: firstItem.포트_A,
      lineNumber: firstItem.회선번호,                 // 회선번호 (숫자)
      ruInfoList: ruInfoList,
      serviceLocation: firstItem.주소,
      workContent: `${firstItem.작업구분} 작업 - ${firstItem.구분} - ${firstItem.장비위치}`,
      notes: `담당자: DU(${firstItem.DU담당자}) / RU(${firstItem.RU담당자}), 협력사: ${firstItem.협력사}/${firstItem.협력사2}, 비고: ${firstItem.비고}`,
      muxInfo: muxInfo
    };
  });
}