import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';

// 운용팀 정규화 함수 (파서에서 가져옴)
function normalizeOperationTeam(value) {
  const normalized = value.trim();
  const OPERATION_TEAMS = ['운용1팀', '운용2팀', '운용3팀', '운용4팀', '운용5팀', '기타'];
  
  // 직접 매치
  if (OPERATION_TEAMS.includes(normalized)) {
    return normalized;
  }
  
  // 부분 매치
  if (normalized.includes('서부산') || normalized.includes('부산서')) {
    return '운용1팀';
  }
  if (normalized.includes('중부산') || normalized.includes('부산중')) {
    return '운용2팀';
  }
  if (normalized.includes('동부산') || normalized.includes('부산동')) {
    return '운용3팀';
  }
  if (normalized.includes('남부산') || normalized.includes('부산남')) {
    return '운용4팀';
  }
  if (normalized.includes('북부산') || normalized.includes('부산북')) {
    return '운용5팀';
  }
  
  console.log(`⚠️ 운용팀 매핑 실패: "${normalized}" -> 기타`);
  return '기타';
}

// 파서 함수 (실제 파서와 동일)
function parseWorkOrderMUX(row) {
  return {
    managementNumber: String(row[1] || ''), // A열: 관리번호
    requestDate: String(row[3] || ''),      // C열: 작업요청일
    operationTeam: normalizeOperationTeam(String(row[4] || '')), // D열: DU측 운용팀
    ruOperationTeam: normalizeOperationTeam(String(row[6] || '')), // F열: RU측 운용팀
    representativeRuId: String(row[9] || ''), // I열: 대표 RU_ID
    coSiteCount5G: String(row[11] || ''),   // K열: 5G CO-SITE수량
    concentratorName5G: String(row[12] || ''), // L열: 5G 집중국명
    lineNumber: String(row[16] || ''),      // P열: 선번장
    category: String(row[17] || ''),        // Q열: MUX 종류
    serviceType: String(row[27] || ''),     // [열: 서비스구분
    duId: String(row[28] || ''),           // \\열: DU ID
    duName: String(row[29] || ''),         // ]열: DU명
    channelCard: String(row[30] || ''),    // ^열: 채널카드
    port: String(row[31] || ''),           // _열: 포트
    equipmentType: 'MUX',
    equipmentName: String(row[12] || '')   // L열: 집중국명을 장비명으로 사용
  };
}

// 실제 파서 테스트
async function testRealParser() {
  console.log('🧪 실제 엑셀 파일로 파서 테스트 시작');
  
  try {
    // 엑셀 파일 읽기
    const fileBuffer = readFileSync('test-excel-data.xlsx');
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    if (workbook.SheetNames.length === 0) {
      console.log('❌ 엑셀 파일에 시트가 없습니다.');
      return;
    }
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: '',
      raw: false 
    });
    
    console.log(`📊 Excel 파일 로드: ${jsonData.length}행`);
    console.log('📋 헤더 구조: 2-3행 (메인헤더, 서브헤더), 데이터: 4행부터');
    
    // 헤더 확인
    console.log('\n📝 헤더 구조 확인:');
    console.log('2행 (메인헤더):', jsonData[1]?.slice(0, 5) || '없음');
    console.log('3행 (서브헤더):', jsonData[2]?.slice(0, 5) || '없음');
    
    const parsedData = [];
    const errors = [];
    
    // 데이터 섹션 파싱 (3행부터 시작)
    console.log('\n📝 데이터 섹션 파싱 (3행부터)...');
    for (let i = 2; i < jsonData.length; i++) { // 3행부터 (0-based index 2)
      const row = jsonData[i];
      if (!row || row.every(cell => !cell)) continue;
      
      try {
        const workOrder = parseWorkOrderMUX(row);
        
        // 필수 필드 검증
        if (workOrder.managementNumber || workOrder.requestDate || workOrder.operationTeam) {
          parsedData.push(workOrder);
          console.log(`  ✅ ${i + 1}행: ${workOrder.managementNumber || '미지정'} - ${workOrder.operationTeam}`);
          
          // 상세 정보 출력
          console.log(`     📍 작업요청일: ${workOrder.requestDate}`);
          console.log(`     📍 집중국명: ${workOrder.concentratorName5G}`);
          console.log(`     📍 DU ID: ${workOrder.duId}`);
          console.log(`     📍 DU명: ${workOrder.duName}`);
          console.log('');
        } else {
          console.log(`  ⚠️ ${i + 1}행: 필수 필드 부족으로 건너뜀`);
        }
      } catch (error) {
        errors.push(`${i + 1}행: 데이터 파싱 오류 - ${error}`);
        console.log(`  ❌ ${i + 1}행: 파싱 오류 - ${error}`);
      }
    }
    
    console.log(`🎯 총 ${parsedData.length}개 작업지시 파싱 완료`);
    
    if (errors.length > 0) {
      console.log('\n❌ 발생한 오류들:');
      errors.forEach(error => console.log(`  - ${error}`));
    }
    
    // 결과 요약
    console.log('\n📊 파싱 결과 요약:');
    console.log(`  ✅ 성공적으로 파싱된 작업지시: ${parsedData.length}개`);
    console.log(`  ❌ 파싱 오류: ${errors.length}개`);
    console.log(`  📈 성공률: ${((parsedData.length / (parsedData.length + errors.length)) * 100).toFixed(1)}%`);
    
    return {
      success: errors.length === 0,
      data: parsedData,
      errors
    };
    
  } catch (error) {
    console.log(`❌ 파일 읽기 오류: ${error}`);
    return {
      success: false,
      data: [],
      errors: [`파일 읽기 오류: ${error}`]
    };
  }
}

// 실행
testRealParser();