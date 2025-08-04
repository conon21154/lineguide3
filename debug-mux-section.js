import XLSX from 'xlsx';
import fs from 'fs';

const wslPath = '/mnt/c/Users/conon/Desktop/작업지시.xlsx';

console.log('🔍 MUX 섹션 정확한 컬럼 분석...\n');

try {
  const workbook = XLSX.readFile(wslPath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1,
    defval: '',
    raw: false 
  });

  console.log('📋 MUX 설치 정보 헤더 분석 (16~17행):');
  for (let i = 15; i < 17; i++) { // 16~17행
    const row = jsonData[i];
    console.log(`\n${i + 1}행 헤더:`);
    row.forEach((cell, index) => {
      if (cell && cell.toString().trim()) {
        console.log(`  ${String.fromCharCode(65 + index)}열(${index + 1}): "${cell}"`);
      }
    });
  }

  console.log('\n📋 MUX 설치 정보 실제 데이터 (18행 - 25_인빌딩_0211):');
  const row18 = jsonData[17]; // 18행 (0-based index)
  console.log('\n실제 데이터 값들:');
  row18.forEach((cell, index) => {
    if (cell && cell.toString().trim()) {
      const colLetter = String.fromCharCode(65 + index);
      console.log(`  ${colLetter}열(${index + 1}): "${cell}"`);
    }
  });

  console.log('\n🔍 실제 값과 기대값 비교:');
  console.log(`관리번호: A열 = "${row18[0]}" ✅`);
  console.log(`작업요청일: 어느 열? B="${row18[1]}", C="${row18[2]}", D="${row18[3]}"`);
  console.log(`운용팀: 어느 열? B="${row18[1]}", C="${row18[2]}", D="${row18[3]}", E="${row18[4]}"`);
  console.log(`장비명: 어느 열에 "남포동6가_더베이먼트..." 있나?`);
  
  // 장비명 찾기
  row18.forEach((cell, index) => {
    if (cell && cell.toString().includes('남포동6가')) {
      console.log(`  장비명 발견! ${String.fromCharCode(65 + index)}열(${index + 1}): "${cell}"`);
    }
  });

  console.log(`5G 집중국: 어느 열에 "서부산망(안)" 있나?`);
  // 5G 집중국 찾기
  row18.forEach((cell, index) => {
    if (cell && cell.toString().includes('서부산망')) {
      console.log(`  5G 집중국 발견! ${String.fromCharCode(65 + index)}열(${index + 1}): "${cell}"`);
    }
  });

  console.log(`구분: 어느 열에 "RT 2군 / COT 신설" 있나?`);
  // 구분 찾기
  row18.forEach((cell, index) => {
    if (cell && cell.toString().includes('RT 2군')) {
      console.log(`  구분 발견! ${String.fromCharCode(65 + index)}열(${index + 1}): "${cell}"`);
    }
  });

  console.log(`서비스구분: 어느 열에 "아라" 있나?`);
  // 서비스구분 찾기
  row18.forEach((cell, index) => {
    if (cell && cell.toString().includes('아라')) {
      console.log(`  서비스구분 발견! ${String.fromCharCode(65 + index)}열(${index + 1}): "${cell}"`);
    }
  });

} catch (error) {
  console.error('❌ 오류:', error.message);
}