import * as XLSX from 'xlsx';
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
  
  // 직접 매치 - 원본 값 우선 유지
  if (OPERATION_TEAMS.includes(normalized as OperationTeam)) {
    return normalized as OperationTeam;
  }
  
  // 부분 매치 - 원본 값을 유지하면서 비슷한 값 찾기
  if (normalized.includes('울산')) {
    return '울산T';
  }
  if (normalized.includes('동부산')) {
    return '동부산T';
  }
  if (normalized.includes('중부산')) {
    return '중부산T';
  }
  if (normalized.includes('서부산')) {
    return '서부산T';
  }
  if (normalized.includes('김해')) {
    return '김해T';
  }
  if (normalized.includes('창원')) {
    return '창원T';
  }
  if (normalized.includes('진주')) {
    return '진주T';
  }
  if (normalized.includes('통영')) {
    return '통영T';
  }
  if (normalized.includes('지하철')) {
    return '지하철T';
  }
  
  return '기타';
}

// 병합된 헤더 정보를 처리하는 함수
function processMergedHeaders(jsonData: unknown[][]): { [key: string]: number } {
  const headerMapping: { [key: string]: number } = {};
  
  
  // 헤더 텍스트 패턴 정의 (사용자 요청 기준 영어 필드명)
  const headerPatterns = {
    'managementNumber': [
      '관리번호', '관리', '번호'
    ],
    'requestDate': [
      '작업요청일', '요청일', '작업일', '요청', '일정', '날짜', '예정일', '작업 요청일'
    ],
    'duTeam': [
      'DU측 운용팀', 'DU측', 'DU 운용팀', 'DU운용팀'
    ],
    'duOwner': [
      'DU담당자', 'DU 담당자'
    ],
    'ruTeam': [
      'RU측 운용팀', 'RU측', 'RU 운용팀', 'RU운용팀'
    ],
    'ruOwner': [
      'RU담당자', 'RU 담당자'
    ],
    'workCategory': [
      '구분'
    ],
    'ruId': [
      '대표 RU_ID', 'RU_ID', 'RU ID', 'RUID', '대표RU'
    ],
    'ruName': [
      '대표 RU_명', 'RU_명', 'RU 명', 'RU명', '대표RU명'
    ],
    'coSiteCount5g': [
      '5G CO-SITE 수량', '5G CO-', 'Co-Site', '수량', 'CO-SITE', 'SITE 수량', 'co-SITE 수량'
    ],
    'focus5gName': [
      '5G 집중국명', '집중국명', '집중국', '국명'
    ],
    'vendor1': [
      '협력사'
    ],
    'vendor2': [
      '협력사'
    ],
    'lineNumber': [
      '회선번호', '회선', '번호'
    ],
    'lteMuxInfo': [
      '선번장', 'LTE MUX', 'LTE', 'MUX', '(LTE MUX / 국간,간선망)'
    ],
    'muxTypeMain': [
      'MUX 종류', '종류', '타입', 'Type', 'MUX종류'
    ],
    'sido': [
      '시/도'
    ],
    'sigungu': [
      '시/군/구'
    ],
    'eupMyeonDong': [
      '읍/면/동(리)'
    ],
    'beonji': [
      '번지'
    ],
    'buildingName': [
      '건물명'
    ],
    'equipmentLocation': [
      '장비위치'
    ],
    'remark': [
      '비고'
    ],
    'muxBranch': [
      'MUX분출여부'
    ],
    'muxTypeSub': [
      'MUX종류', 'MUX 종류'
    ],
    'serviceType': [
      '서비스 구분', '서비스구분', '서비스', '구분'
    ],
    'duId': [
      'DU ID', 'DUID', 'DU_ID', 'DU-ID'
    ],
    'duName': [
      'DU 명', 'DU명', 'DU_명', 'DU-명'
    ],
    'channelCard': [
      '채널카드', '채널', '카드', 'CH', 'CARD'
    ],
    'port': [
      '포트', 'PORT', '포트A', 'A', 'Port A'
    ]
  };
  
  
  // 2행과 3행에서 병합된 헤더 텍스트 분석
  if (jsonData.length >= 3) {
    const row2 = jsonData[1] || []; // 2행 (상위 헤더)
    const row3 = jsonData[2] || []; // 3행 (하위 헤더)
    
    
    
    // 최대 컬럼 수까지 검사
    const maxCols = Math.max(row2.length, 30);
    
    for (let colIndex = 0; colIndex < maxCols; colIndex++) {
      const header2 = String(row2[colIndex] || '').trim();
      const header3 = String(row3[colIndex] || '').trim();
      const combinedHeader = header2 + ' ' + header3; // 2행과 3행 헤더 결합
      
      // 각 필수 필드와 매칭 시도
      for (const [fieldName, patterns] of Object.entries(headerPatterns)) {
        if (headerMapping[fieldName] === undefined) {
          // 패턴 매칭 - 대소문자 무시, 부분 매칭
          const isMatch = patterns.some(pattern => {
            const patternLower = pattern.toLowerCase();
            const header2Lower = header2.toLowerCase();
            const header3Lower = header3.toLowerCase();
            const combinedLower = combinedHeader.toLowerCase();
            
            return header2Lower.includes(patternLower) || 
                   header3Lower.includes(patternLower) || 
                   combinedLower.includes(patternLower);
          });
          
          if (isMatch) {
            headerMapping[fieldName] = colIndex;
            break;
          }
        }
      }
    }
  }
  
  
  // 매핑되지 않은 필드 확인 및 경고
  const unmappedFields = Object.keys(headerPatterns).filter(field => headerMapping[field] === undefined);
  if (unmappedFields.length > 0) {
    
    // 기본 순서대로 매핑 (fallback)
    let fallbackIndex = 0;
    for (const field of unmappedFields) {
      headerMapping[field] = fallbackIndex++;
    }
  }
  
  console.log('🗂️ 헤더 매핑 결과:', headerMapping);
  return headerMapping;
}

// 셀 값을 안전하게 문자열로 변환하고 빈 값은 N/A로 처리
function safeStringValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }
  return String(value).trim();
}

// 작업지시 데이터 추출하여 DU측과 RU측 작업을 별도로 생성하는 함수
function extractWorkOrders(row: unknown[], headerMapping: { [key: string]: number }): ExtractedWorkOrderData[] {
  // 회선번호 정규화 (지수표기법 처리)
  const rawLineNumber = row[headerMapping['lineNumber']];
  const lineNumberStr = normalizeCircuit(rawLineNumber);
  console.log(`🔍 Excel 회선번호 정규화: "${rawLineNumber}" -> "${lineNumberStr}"`);
  
  // 서비스 구분 디버깅
  const serviceTypeRaw = row[headerMapping['serviceType']];
  const serviceTypeProcessed = safeStringValue(serviceTypeRaw);
  console.log(`🔍 서비스 구분 파싱 - 원본: "${serviceTypeRaw}", 처리후: "${serviceTypeProcessed}", 컬럼: ${headerMapping['serviceType']}`);

  const baseData = {
    관리번호: safeStringValue(row[headerMapping['managementNumber']]),
    작업요청일: safeStringValue(row[headerMapping['requestDate']]),
    대표_RU_ID: safeStringValue(row[headerMapping['ruId']]),
    대표_RU_명: safeStringValue(row[headerMapping['ruName']]),
    "5G_Co_Site_수량": safeStringValue(row[headerMapping['coSiteCount5g']]),
    "5G_집중국명": safeStringValue(row[headerMapping['focus5gName']]),
    회선번호: lineNumberStr,
    선번장: safeStringValue(row[headerMapping['lteMuxInfo']]),
    종류: safeStringValue(row[headerMapping['muxTypeMain']]),
    서비스_구분: serviceTypeProcessed,
    DU_ID: safeStringValue(row[headerMapping['duId']]),
    DU_명: safeStringValue(row[headerMapping['duName']]),
    채널카드: safeStringValue(row[headerMapping['channelCard']]),
    포트_A: safeStringValue(row[headerMapping['port']]),
    구분: safeStringValue(row[headerMapping['workCategory']]),
    협력사: safeStringValue(row[headerMapping['vendor1']]),
    협력사2: safeStringValue(row[headerMapping['vendor2']]),
    건물명: safeStringValue(row[headerMapping['buildingName']]),
    장비위치: safeStringValue(row[headerMapping['equipmentLocation']]),
    비고: safeStringValue(row[headerMapping['remark']]),
    DU담당자: safeStringValue(row[headerMapping['duOwner']]),
    RU담당자: safeStringValue(row[headerMapping['ruOwner']]),
    MUX분출여부: safeStringValue(row[headerMapping['muxBranch']]),
    MUX종류2: safeStringValue(row[headerMapping['muxTypeSub']]),
    시도: safeStringValue(row[headerMapping['sido']]),
    시군구: safeStringValue(row[headerMapping['sigungu']]),
    읍면동: safeStringValue(row[headerMapping['eupMyeonDong']]),
    번지: safeStringValue(row[headerMapping['beonji']])
  };
  
  const duTeam = normalizeOperationTeam(safeStringValue(row[headerMapping['duTeam']]));
  const ruTeam = normalizeOperationTeam(safeStringValue(row[headerMapping['ruTeam']]));
  
  // 주소 조합
  const locationParts = [
    baseData.시도,
    baseData.시군구,
    baseData.읍면동,
    baseData.번지
  ].filter(part => part !== 'N/A');
  const fullAddress = locationParts.join(' ');

  const result: ExtractedWorkOrderData[] = [];
  
  // DU측 작업 생성 (항상 생성)
  result.push({
    ...baseData,
    작업구분: 'DU측',
    DU측_운용팀: duTeam,
    RU측_운용팀: ruTeam,
    주소: fullAddress
  });
  
  // RU측 작업 생성 (RU측 운용팀이 유효한 경우 항상 생성)
  if (ruTeam !== '기타') {
    result.push({
      ...baseData,
      작업구분: 'RU측',
      DU측_운용팀: duTeam,
      RU측_운용팀: ruTeam,
      주소: fullAddress
    });
  }
  
  return result;
}

export function parseExcelFile(file: File): Promise<ExcelParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellStyles: true });
        
        if (workbook.SheetNames.length === 0) {
          resolve({
            success: false,
            data: [],
            errors: ['Excel 파일에 시트가 없습니다.']
          });
          return;
        }
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: '',
          raw: true  // 과학적 표기법 방지를 위해 raw 데이터 사용
        }) as unknown[][];
        
        // 병합된 셀 정보 처리
        const headerMapping = processMergedHeaders(jsonData);
        
        if (jsonData.length < 4) {
          resolve({
            success: false,
            data: [],
            errors: ['Excel 파일이 올바른 형식이 아닙니다. 최소 4행이 필요합니다. (헤더 3행 + 데이터 1행)']
          });
          return;
        }
        
        
        const parsedData = [];
        const errors: string[] = [];
        
        // 데이터는 4행부터 시작 (0-based index 3)
        
        for (let i = 3; i < jsonData.length; i++) { // 4행부터 (0-based index 3)
          const row = jsonData[i];
          
          // 빈 행 체크 - 모든 셀이 비어있거나 공백인 경우 건너뜀
          if (!row || row.every(cell => !cell || String(cell).trim() === '')) {
            continue;
          }
          
          // 불필요한 데이터 필터링 - 감사 인사말 등
          const rowText = row.join(' ').toLowerCase().trim();
          
          // 빈 행이거나 의미없는 텍스트만 있는 행 제외
          if (rowText.includes('감사합니다') || 
              rowText.includes('수고하십시오') ||
              rowText.includes('수고하세요') ||
              rowText.includes('고생하셨습니다') ||
              rowText.includes('안녕히') ||
              rowText.includes('헤더') ||
              rowText.includes('제목') ||
              rowText.includes('ㅎㅎ') ||
              rowText.includes('^^') ||
              rowText.includes('수고') ||
              rowText.includes('안녕') ||
              rowText.includes('잘') ||
              rowText.includes('다음') ||
              rowText === '' ||
              row.every(cell => {
                const cellText = String(cell || '').trim().toLowerCase();
                return cellText === '' || 
                       cellText.length < 2 ||
                       /^[^가-힣a-zA-Z0-9_-]+$/.test(cellText); // 특수문자만 있는 경우
              })) {
            continue;
          }
          
          try {
            const workOrders = extractWorkOrders(row, headerMapping);
            
            // 각 작업지시(DU측/RU측)에 대해 유효성 검증
            for (const workOrder of workOrders) {
              const hasValidData = workOrder.관리번호 !== 'N/A' || 
                                   workOrder.DU_ID !== 'N/A' || 
                                   workOrder.작업요청일 !== 'N/A';
              
              if (hasValidData) {
                parsedData.push(workOrder);
              }
            }
          } catch (error) {
            errors.push((i + 1) + '행: 데이터 파싱 오류 - ' + error);
          }
        }
        
        
        resolve({
          success: errors.length === 0 || parsedData.length > 0,
          data: parsedData,
          errors
        });
        
      } catch (error) {
        resolve({
          success: false,
          data: [],
          errors: ['Excel 파일 파싱 오류: ' + error]
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
    
    reader.readAsArrayBuffer(file);
  });
}

// 동일한 관리번호를 가진 행들을 그룹화하는 함수
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

// 한국어 필드명을 영어 필드명으로 변환하는 함수 (RU 통합 처리 포함)
export function convertToWorkOrderFormat(extractedData: ExtractedWorkOrderData[]): Omit<WorkOrder, 'id' | 'status' | 'createdAt' | 'updatedAt'>[] {
  const groupedData = groupByManagementNumber(extractedData);
  
  return groupedData.map(group => {
    const firstItem = group[0]; // 기본 정보는 첫 번째 항목에서 가져옴
    
    // 여러 RU 정보를 배열로 구성
    const ruInfoList: RuInfo[] = group.map(item => ({
      ruId: item.대표_RU_ID,
      ruName: item.대표_RU_명,
      channelCard: item.채널카드,
      port: item.포트_A
    }));
    
    return {
      managementNumber: `${firstItem.관리번호}_${firstItem.작업구분}`, // 관리번호에 작업구분 추가
      requestDate: firstItem.작업요청일,
      workType: firstItem.작업구분 as 'DU측' | 'RU측',  // workType 추가
      operationTeam: firstItem.작업구분 === 'DU측' ? firstItem.DU측_운용팀 : firstItem.RU측_운용팀, // 작업구분에 따라 담당팀 결정
      ruOperationTeam: firstItem.RU측_운용팀, // ruOperationTeam 추가
      representativeRuId: firstItem.대표_RU_ID,
      coSiteCount5G: firstItem['5G_Co_Site_수량'],
      concentratorName5G: firstItem['5G_집중국명'],  // 5G 집중국명
      equipmentType: firstItem.구분 || '5G 장비',   // 구분
      equipmentName: firstItem.대표_RU_명,          // RU명을 장비명으로 사용
      category: firstItem.구분,                     // 구분을 카테고리로 사용
      serviceType: firstItem.서비스_구분,           // 서비스구분 (CH4, CH5, CH6 등)
      duId: firstItem.DU_ID,
      duName: firstItem.DU_명,
      channelCard: firstItem.채널카드,
      port: firstItem.포트_A,
      lineNumber: firstItem.회선번호,               // 회선번호 (숫자)
      ruInfoList: ruInfoList, // 여러 RU 정보 배열
      serviceLocation: firstItem.주소, // serviceLocation 추가
      workContent: `${firstItem.작업구분} 작업 - ${firstItem.구분} - ${firstItem.장비위치}`, // workContent 추가
      notes: `담당자: DU(${firstItem.DU담당자}) / RU(${firstItem.RU담당자}), 협력사: ${firstItem.협력사}/${firstItem.협력사2}, 비고: ${firstItem.비고}`,
      muxInfo: {
        lteMux: firstItem.선번장,                   // LTE MUX 정보
        muxSplitStatus: firstItem.MUX분출여부 || 'N/A',
        muxType: firstItem.MUX종류2 || firstItem.종류,
        서비스구분: firstItem.서비스_구분
      }
    };
  });
}