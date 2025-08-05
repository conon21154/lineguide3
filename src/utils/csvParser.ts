import { ExcelParseResult, OperationTeam, ExtractedWorkOrderData, WorkOrder, RuInfo } from '@/types';

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

// CSV 헤더 매핑 (예상되는 헤더명들)
const CSV_HEADER_MAPPING = {
  '관리번호': ['관리번호', '관리', '번호'],
  '작업요청일': ['작업요청일', '요청일', '작업일', '요청', '일정', '날짜', '예정일'],
  'DU측_운용팀': ['DU측 운용팀', 'DU측', 'DU 운용팀', 'DU운용팀'],
  'RU측_운용팀': ['RU측 운용팀', 'RU측', 'RU 운용팀', 'RU운용팀'],
  '대표_RU_ID': ['대표 RU_ID', 'RU_ID', 'RU ID', 'RUID', '대표RU'],
  '대표_RU_명': ['대표 RU_명', 'RU_명', 'RU 명', 'RU명', '대표RU명'],
  '5G_Co_Site_수량': ['5G CO-SITE 수량', '5G CO-', 'Co-Site', '수량', 'CO-SITE'],
  '5G_집중국명': ['5G 집중국명', '집중국명', '집중국', '국명'],
  '회선번호': ['회선번호', '회선', '번호'],
  '선번장': ['선번장', 'LTE MUX', 'LTE', 'MUX'],
  '종류': ['MUX 종류', '종류', '타입', 'Type'],
  '서비스_구분': ['서비스 구분', '서비스구분', '서비스', '구분'],
  'DU_ID': ['DU ID', 'DUID', 'DU_ID', 'DU-ID'],
  'DU_명': ['DU 명', 'DU명', 'DU_명', 'DU-명'],
  '채널카드': ['채널카드', '채널', '카드', 'CH', 'CARD'],
  '포트_A': ['포트', 'PORT', '포트A', 'A', 'Port A']
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

// 헤더 매핑 찾기
function findHeaderMapping(headers: string[]): { [key: string]: number } {
  const mapping: { [key: string]: number } = {};
  
  for (const [fieldName, patterns] of Object.entries(CSV_HEADER_MAPPING)) {
    const headerIndex = headers.findIndex(header => {
      const normalizedHeader = header.toLowerCase().trim();
      return patterns.some(pattern => 
        normalizedHeader.includes(pattern.toLowerCase())
      );
    });
    
    if (headerIndex !== -1) {
      mapping[fieldName] = headerIndex;
    }
  }
  
  console.log('📋 CSV 헤더 매핑:', mapping);
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
  
  // 서비스 구분 디버깅
  const serviceTypeIndex = headerMapping['서비스_구분'];
  const serviceTypeValue = row[serviceTypeIndex];
  console.log(`🔍 서비스 구분 - 인덱스: ${serviceTypeIndex}, 원본값: "${serviceTypeValue}"`);
  
  const baseData = {
    관리번호: safeValue(row[headerMapping['관리번호']]),
    작업요청일: safeValue(row[headerMapping['작업요청일']]),
    대표_RU_ID: safeValue(row[headerMapping['대표_RU_ID']]),
    대표_RU_명: safeValue(row[headerMapping['대표_RU_명']]),
    "5G_Co_Site_수량": safeValue(row[headerMapping['5G_Co_Site_수량']]),
    "5G_집중국명": safeValue(row[headerMapping['5G_집중국명']]),
    회선번호: safeValue(row[headerMapping['회선번호']]),
    선번장: safeValue(row[headerMapping['선번장']]),
    종류: safeValue(row[headerMapping['종류']]),
    서비스_구분: safeValue(serviceTypeValue),
    DU_ID: safeValue(row[headerMapping['DU_ID']]),
    DU_명: safeValue(row[headerMapping['DU_명']]),
    채널카드: safeValue(row[headerMapping['채널카드']]),
    포트_A: safeValue(row[headerMapping['포트_A']])
  };
  
  const duTeam = normalizeOperationTeam(safeValue(row[headerMapping['DU측_운용팀']]));
  const ruTeam = normalizeOperationTeam(safeValue(row[headerMapping['RU측_운용팀']]));
  
  const result: ExtractedWorkOrderData[] = [];
  
  // DU측 작업 생성
  result.push({
    ...baseData,
    작업구분: 'DU측',
    DU측_운용팀: duTeam,
    RU측_운용팀: ruTeam
  });
  
  // RU측 작업 생성
  if (ruTeam !== '기타') {
    result.push({
      ...baseData,
      작업구분: 'RU측',
      DU측_운용팀: duTeam,
      RU측_운용팀: ruTeam
    });
  }
  
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
    
    reader.readAsText(file, 'UTF-8');
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
    
    return {
      managementNumber: `${firstItem.관리번호}_${firstItem.작업구분}`,
      requestDate: firstItem.작업요청일,
      operationTeam: firstItem.작업구분 === 'DU측' ? firstItem.DU측_운용팀 : firstItem.RU측_운용팀,
      representativeRuId: firstItem.대표_RU_ID,
      coSiteCount5G: firstItem['5G_Co_Site_수량'],
      concentratorName5G: firstItem['5G_집중국명'],
      equipmentType: '5G 장비',
      equipmentName: firstItem.대표_RU_명,
      category: `${firstItem.종류} (${firstItem.작업구분})`,
      serviceType: firstItem.서비스_구분, // 여기서 CH3, CH6 값이 그대로 보존됨
      duId: firstItem.DU_ID,
      duName: firstItem.DU_명,
      channelCard: firstItem.채널카드,
      port: firstItem.포트_A,
      lineNumber: firstItem.선번장,
      ruInfoList: ruInfoList,
      notes: `작업구분: ${firstItem.작업구분}, 회선번호: ${firstItem.회선번호}, DU측: ${firstItem.DU측_운용팀}, RU측: ${firstItem.RU측_운용팀}, RU 수량: ${group.length}개`
    };
  });
}