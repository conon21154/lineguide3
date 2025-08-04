import XLSX from 'xlsx';
import fs from 'fs';

const wslPath = '/mnt/c/Users/conon/Desktop/작업지시.xlsx';

console.log('🧪 Excel 파서 테스트 시작...\n');

try {
  const workbook = XLSX.readFile(wslPath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1,
    defval: '',
    raw: false 
  });

  console.log('📊 파일 정보:');
  console.log(`- 총 행 수: ${jsonData.length}`);
  console.log(`- 데이터 범위: 10행부터 ${jsonData.length}행까지\n`);

  // 컬럼 매핑
  const columnMappings = {
    '작업요청일': ['작업요청일', '작업', '요청일'],
    '운용팀': ['운용팀', '팀'],
    '장비ID': ['장비ID', '장비'],
    '5G 집중국명': ['5G 집중국명', '집중국명', '5G집중국', '집중국'],
    'MUX선번': ['MUX선번', 'MUX', '선번'],
    '서비스구분': ['서비스구분', '구분', '서비스'],
    'DU ID': ['DU ID', 'DUID'],
    'DU 명': ['DU 명', 'DU명', 'DU이름'],
    'CH': ['CH', '채널', '채널카드', 'Channel'],
    'CARD': ['CARD', '카드', '채널카드', 'Card'],
    'PORT': ['PORT', '포트', 'Port']
  };

  // 헤더 찾기
  const headerRows = [...jsonData.slice(6, 9), ...jsonData.slice(15, 17)];
  const columnIndexes = {};

  headerRows.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell && typeof cell === 'string') {
        const trimmedValue = cell.trim();
        
        Object.entries(columnMappings).forEach(([requiredCol, keywords]) => {
          if (columnIndexes[requiredCol]) return;
          
          keywords.forEach(keyword => {
            if (trimmedValue.includes(keyword) || keyword.includes(trimmedValue)) {
              columnIndexes[requiredCol] = colIndex;
            }
          });
        });
      }
    });
  });

  console.log('🎯 찾은 컬럼 매핑:');
  Object.entries(columnIndexes).forEach(([col, index]) => {
    console.log(`  ${col}: ${index + 1}열`);
  });
  console.log('');

  // 데이터 파싱 시뮬레이션
  const dataRows = jsonData.slice(9);
  let validCount = 0;
  let skippedCount = 0;
  const parsedData = [];

  console.log('📝 데이터 파싱 결과:');
  
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNumber = i + 10;
    
    // 빈 행 건너뛰기
    if (!row || row.every(cell => !cell)) {
      console.log(`  ${rowNumber}행: 빈 행 - 건너뜀`);
      skippedCount++;
      continue;
    }
    
    // 섹션 제목이나 안내 문구 건너뛰기
    const firstCell = String(row[0] || '').trim();
    if (firstCell.startsWith('[') || 
        firstCell.includes('정보]') || 
        firstCell.includes('감사합니다') ||
        firstCell.includes('수고하십시오')) {
      console.log(`  ${rowNumber}행: 제목/안내문 - 건너뜀`);
      skippedCount++;
      continue;
    }
    
    // 헤더 행 건너뛰기
    if (firstCell.includes('요청일') || 
        firstCell.includes('운용팀') || 
        firstCell.includes('관리번호')) {
      console.log(`  ${rowNumber}행: 헤더 - 건너뜀`);
      skippedCount++;
      continue;
    }

    // MUX 설치 정보 섹션 여부 확인
    const isMuxSection = String(row[0] || '').includes('_인빌딩_') || 
                       String(row[0] || '').includes('25_');
    
    let workOrder;
    
    if (isMuxSection) {
      // MUX 설치 정보 섹션의 컬럼 구조 (실제 데이터 기준)
      workOrder = {
        requestDate: row[2] || '', // 3열: 요청일
        operationTeam: row[3] || '', // 4열: DU측 운용팀  
        equipmentId: row[8] || '', // 9열: 장비ID (NPPS...)
        duId: row[8] || '', // 9열: 장비ID
      };
    } else {
      // 5G 개통 정보 섹션의 기본 구조
      workOrder = {
        requestDate: row[columnIndexes['작업요청일']] || '',
        operationTeam: row[columnIndexes['운용팀']] || '',
        equipmentId: row[columnIndexes['장비ID']] || '',
        duId: row[columnIndexes['DU ID']] || '',
      };
    }

    // 필수 필드 체크
    if (!workOrder.requestDate || 
        !workOrder.operationTeam || 
        (!workOrder.equipmentId && !workOrder.duId)) {
      console.log(`  ${rowNumber}행: 필수 필드 부족 - 건너뜀`);
      console.log(`    요청일: "${workOrder.requestDate}", 팀: "${workOrder.operationTeam}", 장비ID: "${workOrder.equipmentId}", DU ID: "${workOrder.duId}"`);
      skippedCount++;
      continue;
    }

    console.log(`  ${rowNumber}행: ✅ 유효한 데이터`);
    validCount++;
    parsedData.push(workOrder);
  }

  console.log('\n📊 파싱 요약:');
  console.log(`- 전체 데이터 행: ${dataRows.length}`);
  console.log(`- 유효한 작업지시: ${validCount}`);
  console.log(`- 건너뛴 행: ${skippedCount}`);
  
  if (validCount > 0) {
    console.log('\n✅ 파싱된 작업지시 예시:');
    parsedData.slice(0, 3).forEach((order, index) => {
      console.log(`  ${index + 1}. ${order.requestDate} | ${order.operationTeam} | ${order.equipmentId || order.duId}`);
    });
  }

} catch (error) {
  console.error('❌ 오류:', error.message);
}