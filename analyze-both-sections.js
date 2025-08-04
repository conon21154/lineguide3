import XLSX from 'xlsx';
import fs from 'fs';

const wslPath = '/mnt/c/Users/conon/Desktop/작업지시.xlsx';

console.log('🔍 두 섹션 정확한 분석...\n');

try {
  const workbook = XLSX.readFile(wslPath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1,
    defval: '',
    raw: false 
  });

  // 5G 개통 정보 섹션 분석
  console.log('📋 섹션 1: 5G 개통 정보 (8~13행)');
  console.log('8행 헤더:');
  const header8 = jsonData[7]; // 8행
  header8.forEach((cell, index) => {
    if (cell && cell.toString().trim()) {
      console.log(`  ${String.fromCharCode(65 + index)}열: "${cell}"`);
    }
  });

  console.log('\n9행 서브헤더:');
  const header9 = jsonData[8]; // 9행
  header9.forEach((cell, index) => {
    if (cell && cell.toString().trim()) {
      console.log(`  ${String.fromCharCode(65 + index)}열: "${cell}"`);
    }
  });

  console.log('\n10행 실제 데이터 예시:');
  const data10 = jsonData[9]; // 10행
  data10.forEach((cell, index) => {
    if (cell && cell.toString().trim()) {
      console.log(`  ${String.fromCharCode(65 + index)}열: "${cell}"`);
    }
  });

  console.log('\n\n📋 섹션 2: MUX 설치 정보 (16~21행)');
  console.log('16행 헤더:');
  const header16 = jsonData[15]; // 16행
  header16.forEach((cell, index) => {
    if (cell && cell.toString().trim()) {
      console.log(`  ${String.fromCharCode(65 + index)}열: "${cell}"`);
    }
  });

  console.log('\n17행 서브헤더:');
  const header17 = jsonData[16]; // 17행
  header17.forEach((cell, index) => {
    if (cell && cell.toString().trim()) {
      console.log(`  ${String.fromCharCode(65 + index)}열: "${cell}"`);
    }
  });

  console.log('\n18행 실제 데이터 예시:');
  const data18 = jsonData[17]; // 18행
  data18.forEach((cell, index) => {
    if (cell && cell.toString().trim()) {
      console.log(`  ${String.fromCharCode(65 + index)}열: "${cell}"`);
    }
  });

  console.log('\n\n🎯 각 섹션별 필요한 필드 매핑:');
  console.log('5G 개통 정보 섹션 (10행 기준):');
  console.log(`  작업요청일: A열 = "${data10[0]}"`);
  console.log(`  운용팀: B열 = "${data10[1]}"`);
  console.log(`  5G 집중국명: E열 = "${data10[4]}"`);
  console.log(`  장비명: H열 = "${data10[7]}"`);
  console.log(`  서비스구분: D열 = "${data10[3]}"`);

  console.log('\nMUX 설치 정보 섹션 (18행 기준):');
  console.log(`  관리번호: A열 = "${data18[0]}"`);
  console.log(`  작업요청일: C열 = "${data18[2]}"`);
  console.log(`  운용팀: D열 = "${data18[3]}"`);
  console.log(`  5G 집중국명: L열 = "${data18[11]}"`);
  console.log(`  장비명(RU명): J열 = "${data18[9]}"`);
  console.log(`  시설협력사: M열 = "${data18[12]}"`);
  console.log(`  OSP협력사: N열 = "${data18[13]}"`);
  console.log(`  구분: H열 = "${data18[7]}"`);

} catch (error) {
  console.error('❌ 오류:', error.message);
}