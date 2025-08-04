import XLSX from 'xlsx';
import fs from 'fs';

const wslPath = '/mnt/c/Users/conon/Desktop/작업지시.xlsx';

console.log('🔍 실제 엑셀 구조 상세 분석...\n');

try {
  const workbook = XLSX.readFile(wslPath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1,
    defval: '',
    raw: false 
  });

  console.log('📋 5G 개통 정보 섹션 분석 (10~13행):');
  for (let i = 9; i < 13; i++) { // 10~13행
    const row = jsonData[i];
    console.log(`\n${i + 1}행 데이터:`);
    console.log(`  A열(1): "${row[0]}" (작업요청일)`);
    console.log(`  B열(2): "${row[1]}" (운용팀)`);
    console.log(`  C열(3): "${row[2]}" (담당자)`);
    console.log(`  D열(4): "${row[3]}" (구분)`);
    console.log(`  E열(5): "${row[4]}" (5G 집중국명)`);
    console.log(`  F열(6): "${row[5]}" (장비구분)`);
    console.log(`  G열(7): "${row[6]}" (장비ID)`);
    console.log(`  H열(8): "${row[7]}" (장비명)`);
    console.log(`  I열(9): "${row[8]}" (서비스별)`);
    console.log(`  J열(10): "${row[9]}" (협력사)`);
    console.log(`  K열(11): "${row[10]}" (MUX 정보)`);
    console.log(`  L열(12): "${row[11]}" (회선번호)`);
    console.log(`  M열(13): "${row[12]}" (구분)`);
    console.log(`  N열(14): "${row[13]}" (위치)`);
    console.log(`  O열(15): "${row[14]}" (DU ID)`);
    console.log(`  P열(16): "${row[15]}" (DU 명)`);
    console.log(`  Q열(17): "${row[16]}" (채널카드)`);
    console.log(`  R열(18): "${row[17]}" (포트A)`);
  }

  console.log('\n📋 MUX 설치 정보 섹션 분석 (18~21행):');
  for (let i = 17; i < 21; i++) { // 18~21행
    const row = jsonData[i];
    console.log(`\n${i + 1}행 데이터:`);
    console.log(`  A열(1): "${row[0]}" (관리번호)`);
    console.log(`  B열(2): "${row[1]}" (작업요청일)`);
    console.log(`  C열(3): "${row[2]}" (DU측 운용팀)`);
    console.log(`  D열(4): "${row[3]}" (DU측 담당자)`);
    console.log(`  E열(5): "${row[4]}" (RU측 운용팀)`);
    console.log(`  F열(6): "${row[5]}" (RU측 담당자)`);
    console.log(`  G열(7): "${row[6]}" (구분)`);
    console.log(`  H열(8): "${row[7]}" (대표 장비ID)`);
    console.log(`  I열(9): "${row[8]}" (대표 장비명)`);
    console.log(`  J열(10): "${row[9]}" (SITE 수량)`);
    console.log(`  K열(11): "${row[10]}" (협력사)`);
    console.log(`  L열(12): "${row[11]}" (협력사)`);
    console.log(`  M열(13): "${row[12]}" (종류)`);
    console.log(`  N열(14): "${row[13]}" (서비스구분)`);
    console.log(`  O열(15): "${row[14]}" (DU ID)`);
    console.log(`  P열(16): "${row[15]}" (DU 명)`);
    console.log(`  Q열(17): "${row[16]}" (선번장 LTE MUX/국간,간선망)`);
    console.log(`  R열(18): "${row[17]}" (채널카드)`);
    console.log(`  S열(19): "${row[18]}" (포트)`);
    console.log(`  T열(20): "${row[19]}" (위치)`);
  }

} catch (error) {
  console.error('❌ 오류:', error.message);
}