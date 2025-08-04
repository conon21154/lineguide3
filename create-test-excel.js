import * as XLSX from 'xlsx';

// 테스트용 엑셀 데이터 생성
function createTestExcel() {
  console.log('🔨 테스트용 엑셀 파일 생성 중...');
  
  const data = [
    [], // 1행 빈 행
    ['헤더1', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC', 'AD', 'AE'], // 2행 메인 헤더
    ['헤더2', '관리번호', 'B', '작업요청일', 'DU측 운용팀', 'E', 'RU측 운용팀', 'G', 'H', '대표 RU_ID', 'J', '5G CO-SITE수량', '5G 집중국명', 'M', 'N', 'O', '선번장', 'MUX 종류', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '서비스구분', 'DU ID', 'DU명', '채널카드', '포트'], // 3행 서브 헤더
    // 4행부터 데이터
    ['', '25_인빌딩_0211', '', '08월06일(수) 내', '서부산T', '', '서부산T', '', '', 'NPPS01491S', '', '1', '서부산망(안)', '', '', '', 'LTE MUX : B0833-06-17...', '10G_3CH', '', '', '', '', '', '', '', '', '', 'CH4', 'NS00260284', '서부산망(안)-01-02(5G)', '2', '8'],
    ['', '25_인빌딩_0212', '', '08월07일(목) 내', '중부산T', '', '중부산T', '', '', 'NPPS01492S', '', '2', '중부산망(안)', '', '', '', 'LTE MUX : B0833-06-18...', '10G_4CH', '', '', '', '', '', '', '', '', '', 'CH3', 'NS00260285', '중부산망(안)-01-03(5G)', '3', '9'],
    ['', '25_인빌딩_0213', '', '08월08일(금) 내', '동부산T', '', '동부산T', '', '', 'NPPS01493S', '', '1', '동부산망(안)', '', '', '', 'LTE MUX : B0833-06-19...', '10G_2CH', '', '', '', '', '', '', '', '', '', 'CH2', 'NS00260286', '동부산망(안)-01-04(5G)', '1', '4']
  ];

  // 워크북 생성
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // 시트 추가
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  
  // 파일 저장
  const filename = 'test-excel-data.xlsx';
  XLSX.writeFile(workbook, filename);
  
  console.log(`✅ 테스트 엑셀 파일 생성 완료: ${filename}`);
  console.log(`📊 총 ${data.length - 3}개의 데이터 행이 포함되었습니다.`);
  
  return filename;
}

// 생성된 파일의 내용 검증
function verifyTestFile(filename) {
  console.log('\n🔍 생성된 파일 검증 중...');
  
  const workbook = XLSX.readFile(filename);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });
  
  console.log(`📋 총 ${jsonData.length}행 읽음`);
  console.log('\n📝 첫 번째 데이터 행 (4행):');
  
  const firstDataRow = jsonData[3]; // 4행 (0-based index 3)
  if (firstDataRow) {
    console.log('  관리번호 (A열):', firstDataRow[1] || '없음');
    console.log('  작업요청일 (C열):', firstDataRow[3] || '없음');
    console.log('  DU측 운용팀 (D열):', firstDataRow[4] || '없음');
    console.log('  5G 집중국명 (L열):', firstDataRow[12] || '없음');
    console.log('  DU ID (\\열):', firstDataRow[28] || '없음');
  }
  
  return jsonData;
}

// 실행
const filename = createTestExcel();
verifyTestFile(filename);