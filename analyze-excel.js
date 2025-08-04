import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Windows 파일 경로를 WSL 경로로 변환
const windowsPath = 'c:/Users/conon/Desktop/작업지시.xlsx';
const wslPath = '/mnt/c/Users/conon/Desktop/작업지시.xlsx';

console.log('📊 Excel 파일 분석 시작...\n');

try {
  // 파일 존재 확인
  if (!fs.existsSync(wslPath)) {
    console.log('❌ 파일을 찾을 수 없습니다:', wslPath);
    console.log('다음 경로들을 확인해보세요:');
    console.log('- /mnt/c/Users/conon/Desktop/');
    console.log('- /mnt/c/Users/conon/Downloads/');
    process.exit(1);
  }

  // Excel 파일 읽기
  const workbook = XLSX.readFile(wslPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  console.log('✅ 파일 읽기 성공!');
  console.log('📋 시트명:', sheetName);
  console.log('📊 시트 범위:', worksheet['!ref']);
  console.log('');

  // JSON으로 변환 (헤더 포함)
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1,
    defval: '',
    raw: false 
  });

  console.log('📏 총 행 수:', jsonData.length);
  console.log('');

  // 헤더 행들 분석 (1~8행)
  console.log('🔍 헤더 구조 분석 (1~8행):');
  for (let i = 0; i < Math.min(8, jsonData.length); i++) {
    const row = jsonData[i];
    const nonEmptyCells = row.filter(cell => cell && cell.toString().trim()).length;
    console.log(`${i + 1}행: ${nonEmptyCells}개 셀 (${row.slice(0, 5).join(' | ')}...)`);
  }
  console.log('');

  // 데이터 행들 분석 (10행부터)
  console.log('📝 데이터 행 분석 (10행부터):');
  const dataStartRow = 9; // 10행은 인덱스 9
  const dataRows = jsonData.slice(dataStartRow);
  console.log(`데이터 행 수: ${dataRows.length}`);
  
  if (dataRows.length > 0) {
    console.log('');
    console.log('📋 데이터 행 상세 분석:');
    dataRows.forEach((row, rowIndex) => {
      const realRowNumber = rowIndex + 10;
      const nonEmptyCells = row.filter(cell => cell && cell.toString().trim()).length;
      
      if (nonEmptyCells === 0) {
        console.log(`  ${realRowNumber}행: 빈 행`);
      } else {
        console.log(`  ${realRowNumber}행: ${nonEmptyCells}개 셀 - 주요 데이터: ${row.slice(0, 10).filter(c => c).join(' | ')}`);
        
        // 문제가 되는 행들 (15, 17, 23행) 상세 분석
        if ([15, 17, 23].includes(realRowNumber)) {
          console.log(`    🔍 ${realRowNumber}행 상세:`);
          row.forEach((cell, colIndex) => {
            if (cell && cell.toString().trim()) {
              console.log(`      컬럼 ${colIndex + 1}: "${cell}"`);
            }
          });
        }
      }
    });
  }

  // 필수 컬럼 검색 (개선된 매핑 로직)
  console.log('');
  console.log('🎯 필수 컬럼 검색 (개선된 매핑):');
  
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

  const headerRows = jsonData.slice(6, 9); // 7~9행
  const foundColumns = {};

  headerRows.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell && typeof cell === 'string') {
        const cellValue = cell.trim();
        
        Object.entries(columnMappings).forEach(([reqCol, keywords]) => {
          if (foundColumns[reqCol]) return; // 이미 찾았으면 스킵
          
          keywords.forEach(keyword => {
            if (cellValue.includes(keyword) || keyword.includes(cellValue)) {
              foundColumns[reqCol] = { row: rowIndex + 7, col: colIndex + 1, value: cellValue };
            }
          });
        });
      }
    });
  });

  Object.keys(columnMappings).forEach(col => {
    if (foundColumns[col]) {
      console.log(`  ✅ ${col}: ${foundColumns[col].row}행 ${foundColumns[col].col}열 (${foundColumns[col].value})`);
    } else {
      console.log(`  ❌ ${col}: 찾을 수 없음`);
    }
  });

} catch (error) {
  console.error('❌ 오류 발생:', error.message);
}