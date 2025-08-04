// 새로운 Excel 파서 테스트
const fs = require('fs');
const XLSX = require('xlsx');

// 14개 필수 항목 정의
const OPERATION_TEAMS = [
  '운용1팀', '운용2팀', '운용3팀', '운용4팀', '운용5팀', '기타'
];

function normalizeOperationTeam(value) {
  const normalized = value.trim();
  
  if (OPERATION_TEAMS.includes(normalized)) {
    return normalized;
  }
  
  // 부분 매치
  if (normalized.includes('서부산') || normalized.includes('부산서')) return '운용1팀';
  if (normalized.includes('중부산') || normalized.includes('부산중')) return '운용2팀';
  if (normalized.includes('동부산') || normalized.includes('부산동')) return '운용3팀';
  if (normalized.includes('남부산') || normalized.includes('부산남')) return '운용4팀';
  if (normalized.includes('북부산') || normalized.includes('부산북')) return '운용5팀';
  
  console.log(`⚠️ 운용팀 매핑 실패: "${normalized}" -> 기타`);
  return '기타';
}

// 병합된 헤더 정보를 처리하는 함수
function processMergedHeaders(jsonData) {
  const headerMapping = {};
  
  // 14개 필수 필드의 헤더 텍스트 패턴 정의
  const headerPatterns = {
    '관리번호': [
      '관리번호', '관리', '번호', 'ID', 'id'
    ],
    '작업요청일': [
      '작업요청일', '요청일', '작업일', '요청', '일정', '날짜', '예정일'
    ],
    'DU측_운용팀': [
      'DU측', '운용팀', 'DU', '운용', '팀', 'DU측운용팀', 'DU 측'
    ],
    '대표_RU_ID': [
      '대표', 'RU_ID', 'RU ID', 'RUID', 'RU-ID', '대표RU', 'RU코드'
    ],
    '대표_RU_명': [
      '대표', 'RU_명', 'RU 명', 'RU명', 'RU-명', '대표RU명', 'RU이름'
    ],
    '5G_Co_Site_수량': [
      '5G', 'Co-Site', '수량', 'CO-SITE', 'Co Site', '개수', 'CNT'
    ],
    '5G_집중국명': [
      '5G', '집중국명', '집중국', '국명', '5G집중국', '센터명'
    ],
    '선번장': [
      '선번장', 'LTE MUX', '회선번호', '국간망', '간선망', 'MUX', '선로'
    ],
    '종류': [
      '종류', '타입', 'Type', '형태', '분류', '구분'
    ],
    '서비스_구분': [
      '서비스', '구분', '서비스구분', 'SERVICE', '서비스타입'
    ],
    'DU_ID': [
      'DU ID', 'DUID', 'DU_ID', 'DU-ID', 'DU코드'
    ],
    'DU_명': [
      'DU 명', 'DU명', 'DU_명', 'DU-명', 'DU이름'
    ],
    '채널카드': [
      '채널카드', '채널', '카드', 'CH', 'CARD', 'Channel'
    ],
    '포트_A': [
      '포트', 'PORT', '포트A', 'A', 'Port A', 'PORT A'
    ]
  };
  
  console.log('🔍 병합된 헤더 분석 시작...');
  
  // 2~3행에서 헤더 텍스트 분석
  if (jsonData.length >= 3) {
    const row2 = jsonData[1] || []; // 2행 (대분류)
    const row3 = jsonData[2] || []; // 3행 (소분류)
    
    console.log(`📋 2행 헤더: ${row2.slice(0, 20).join(' | ')}`);
    console.log(`📋 3행 헤더: ${row3.slice(0, 20).join(' | ')}`);
    
    // 최대 컬럼 수까지 검사
    const maxCols = Math.max(row2.length, row3.length, 30);
    
    for (let colIndex = 0; colIndex < maxCols; colIndex++) {
      const header2 = String(row2[colIndex] || '').trim();
      const header3 = String(row3[colIndex] || '').trim();
      const combinedHeader = `${header2} ${header3}`.trim().replace(/\s+/g, ' ');
      
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
            console.log(`📍 매핑 성공: ${fieldName} -> 컬럼 ${colIndex} (${combinedHeader || header2 || header3})`);
            break;
          }
        }
      }
    }
  }
  
  // 매핑되지 않은 필드 확인 및 경고
  const unmappedFields = Object.keys(headerPatterns).filter(field => headerMapping[field] === undefined);
  if (unmappedFields.length > 0) {
    console.log(`⚠️ 매핑되지 않은 필드: ${unmappedFields.join(', ')}`);
    
    // 기본 순서대로 매핑 (fallback)
    let fallbackIndex = 0;
    for (const field of unmappedFields) {
      headerMapping[field] = fallbackIndex++;
      console.log(`🔄 기본 매핑: ${field} -> 컬럼 ${headerMapping[field]}`);
    }
  }
  
  console.log('✅ 헤더 매핑 완료');
  
  return headerMapping;
}

function safeStringValue(value) {
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }
  return String(value).trim();
}

function extractRequiredFields(row, headerMapping) {
  return {
    관리번호: safeStringValue(row[headerMapping['관리번호']]),
    작업요청일: safeStringValue(row[headerMapping['작업요청일']]),
    DU측_운용팀: normalizeOperationTeam(safeStringValue(row[headerMapping['DU측_운용팀']])),
    대표_RU_ID: safeStringValue(row[headerMapping['대표_RU_ID']]),
    대표_RU_명: safeStringValue(row[headerMapping['대표_RU_명']]),
    "5G_Co_Site_수량": safeStringValue(row[headerMapping['5G_Co_Site_수량']]),
    "5G_집중국명": safeStringValue(row[headerMapping['5G_집중국명']]),
    선번장: safeStringValue(row[headerMapping['선번장']]),
    종류: safeStringValue(row[headerMapping['종류']]),
    서비스_구분: safeStringValue(row[headerMapping['서비스_구분']]),
    DU_ID: safeStringValue(row[headerMapping['DU_ID']]),
    DU_명: safeStringValue(row[headerMapping['DU_명']]),
    채널카드: safeStringValue(row[headerMapping['채널카드']]),
    포트_A: safeStringValue(row[headerMapping['포트_A']])
  };
}

function parseExcelFile(filePath) {
  try {
    const workbook = XLSX.readFile(filePath, { cellStyles: true });
    
    if (workbook.SheetNames.length === 0) {
      return { success: false, data: [], errors: ['Excel 파일에 시트가 없습니다.'] };
    }
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: '',
      raw: false 
    });
    
    if (jsonData.length < 4) {
      return { success: false, data: [], errors: ['Excel 파일이 올바른 형식이 아닙니다. 최소 4행이 필요합니다.'] };
    }
    
    console.log(`📊 Excel 파일 로드: ${jsonData.length}행`);
    console.log('📋 헤더 구조: 2-3행 (병합된 헤더), 데이터: 4행부터');
    console.log('📝 14개 필수 항목만 추출하여 JSON 형태로 출력');
    
    // 헤더 매핑
    const headerMapping = processMergedHeaders(jsonData);
    
    const parsedData = [];
    const errors = [];
    
    // ❗ 데이터는 항상 4행부터 시작 (0-based index 3)
    console.log('📝 데이터 섹션 파싱 (4행부터)...');
    console.log(`📊 총 ${jsonData.length - 3}개 데이터 행 확인`);
    
    for (let i = 3; i < jsonData.length; i++) { // 4행부터 (0-based index 3)
      const row = jsonData[i];
      
      // 빈 행 체크 - 모든 셀이 비어있거나 공백인 경우 건너뜀
      if (!row || row.every(cell => !cell || String(cell).trim() === '')) {
        console.log(`  ⏭️  ${i + 1}행: 빈 행 건너뜀`);
        continue;
      }
      
      try {
        const workOrder = extractRequiredFields(row, headerMapping);
        
        // 유효성 검증 - 관리번호, DU_ID, 작업요청일 중 하나라도 있으면 유효한 데이터
        const hasValidData = workOrder.관리번호 !== 'N/A' || 
                             workOrder.DU_ID !== 'N/A' || 
                             workOrder.작업요청일 !== 'N/A';
        
        if (hasValidData) {
          parsedData.push(workOrder);
          console.log(`  ✅ ${i + 1}행: ${workOrder.관리번호} | ${workOrder.DU측_운용팀} | ${workOrder["5G_집중국명"]}`);
        } else {
          console.log(`  ⚠️ ${i + 1}행: 유효한 데이터 없음 - 건너뜀`);
        }
      } catch (error) {
        errors.push(`${i + 1}행: 데이터 파싱 오류 - ${error}`);
        console.log(`  ❌ ${i + 1}행: 파싱 오류 - ${error}`);
      }
    }
    
    console.log(`🎯 총 ${parsedData.length}개 작업지시 파싱 완료`);
    
    return {
      success: errors.length === 0 || parsedData.length > 0,
      data: parsedData,
      errors
    };
    
  } catch (error) {
    return { success: false, data: [], errors: [`Excel 파일 파싱 오류: ${error}`] };
  }
}

// 테스트 실행
const excelFilePath = './test-excel-data.xlsx';

if (fs.existsSync(excelFilePath)) {
  console.log('🔍 Excel 파일 테스트 시작...\n');
  
  const result = parseExcelFile(excelFilePath);
  
  console.log('\n📊 파싱 결과:');
  console.log(`성공: ${result.success}`);
  console.log(`데이터 수: ${result.data.length}`);
  console.log(`오류 수: ${result.errors.length}`);
  
  if (result.errors.length > 0) {
    console.log('\n❌ 오류 목록:');
    result.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  if (result.data.length > 0) {
    console.log('\n📄 추출된 JSON 데이터 (첫 번째 항목):');
    console.log(JSON.stringify(result.data[0], null, 2));
    
    console.log('\n📄 전체 JSON 배열:');
    console.log(JSON.stringify(result.data, null, 2));
  }
} else {
  console.log('❌ test-excel-data.xlsx 파일을 찾을 수 없습니다.');
  console.log('테스트용 Excel 파일을 생성합니다...');
  
  // 테스트용 Excel 파일 생성
  const testData = [
    ['', '', '', '', '', '', '', '', '', '', '', '', '', ''], // 1행 (빈 행)
    ['관리번호', '작업요청일', 'DU측 운용팀', '대표 RU_ID', '대표 RU_명', '5G Co-Site 수량', '5G 집중국명', '선번장', '종류', '서비스 구분', 'DU ID', 'DU 명', '채널카드', '포트 A'], // 2행 (헤더)
    ['', '', '', '', '', '', '', '', '', '', '', '', '', ''], // 3행 (빈 행 또는 서브헤더)
    ['TEST001', '2024-08-06', '서부산T', 'NPPS01491S', '서부산망(안)', '1', '서부산망(안)', 'B0833-06-17', '10G_3CH', 'CH4', 'NS00260284', '서부산망(안)-01-02(5G)', '2', '8'], // 4행 (데이터)
    ['TEST002', '2024-08-07', '중부산T', 'NPPS01492S', '중부산망(안)', '2', '중부산망(안)', 'B0834-06-18', '10G_4CH', 'CH5', 'NS00260285', '중부산망(안)-01-03(5G)', '3', '9'] // 5행 (데이터)
  ];
  
  const ws = XLSX.utils.aoa_to_sheet(testData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, excelFilePath);
  
  console.log('✅ 테스트용 Excel 파일 생성 완료');
  console.log('다시 테스트를 실행해보세요: node test-new-excel-parser.js');
}