// 업데이트된 파서 테스트
const mockExcelData = [
  [], // 0행 (빈 행)
  ['헤더1', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC', 'AD'], // 1행 (메인헤더)
  ['헤더2', '관리번호', 'B', '작업요청일', 'DU측 운용팀', 'E', 'RU측 운용팀', 'G', 'H', '대표 RU_ID', 'J', '5G CO-SITE수량', '5G 집중국명', 'M', 'N', 'O', '선번장', 'MUX 종류', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '서비스구분', 'DU ID', 'DU명', '채널카드', '포트'], // 2행 (서브헤더)
  ['', '25_인빌딩_0211', '', '08월06일(수) 내', '서부산T', '', '서부산T', '', '', 'NPPS01491S', '', '1', '서부산망(안)', '', '', '', 'LTE MUX : B0833-06-17...', '10G_3CH', '', '', '', '', '', '', '', '', '', 'CH4', 'NS00260284', '서부산망(안)-01-02(5G)', '2', '8'], // 3행 (첫 번째 데이터)
];

// 테스트 함수
function testUpdatedParser() {
  console.log('🧪 업데이트된 파서 테스트 시작');
  console.log(`📊 모의 데이터: ${mockExcelData.length}행`);
  
  // 4행부터 파싱 (index 3)
  const dataStartIndex = 3;
  const row = mockExcelData[dataStartIndex];
  
  console.log('\n📋 원본 행 데이터:', row);
  
  // 새로운 컬럼 매핑으로 파싱 (corrected indices)
  const parsedWorkOrder = {
    managementNumber: String(row[1] || ''), // A열: 관리번호 - array index 1
    requestDate: String(row[3] || ''),      // C열: 작업요청일 - array index 3
    operationTeam: String(row[4] || ''),    // D열: DU측 운용팀 - array index 4
    ruOperationTeam: String(row[6] || ''),  // F열: RU측 운용팀 - array index 6
    representativeRuId: String(row[9] || ''), // I열: 대표 RU_ID - array index 9
    coSiteCount5G: String(row[11] || ''),   // K열: 5G CO-SITE수량 - array index 11
    concentratorName5G: String(row[12] || ''), // L열: 5G 집중국명 - array index 12
    lineNumber: String(row[16] || ''),      // P열: 선번장 - array index 16
    category: String(row[17] || ''),        // Q열: MUX 종류 - array index 17
    serviceType: String(row[27] || ''),     // [열: 서비스구분 - array index 27
    duId: String(row[28] || ''),           // \열: DU ID - array index 28
    duName: String(row[29] || ''),         // ]열: DU명 - array index 29
    channelCard: String(row[30] || ''),    // ^열: 채널카드 - array index 30
    port: String(row[31] || ''),           // _열: 포트 - array index 31
    equipmentType: 'MUX',
    equipmentName: String(row[12] || '')   // L열: 집중국명을 장비명으로 사용
  };
  
  console.log('\n📝 파싱 결과:');
  Object.entries(parsedWorkOrder).forEach(([key, value]) => {
    if (value) {
      console.log(`  ${key}: ${value}`);
    } else {
      console.log(`  ${key}: (비어있음)`);
    }
  });
  
  console.log('\n✅ 파싱 테스트 완료');
  
  // 검증
  const expectedValues = {
    managementNumber: '25_인빌딩_0211',
    requestDate: '08월06일(수) 내',
    operationTeam: '서부산T',
    ruOperationTeam: '서부산T',
    representativeRuId: 'NPPS01491S',
    coSiteCount5G: '1',
    concentratorName5G: '서부산망(안)',
    lineNumber: 'LTE MUX : B0833-06-17...',
    category: '10G_3CH',
    serviceType: 'CH4',
    duId: 'NS00260284',
    duName: '서부산망(안)-01-02(5G)',
    channelCard: '2',
    port: '8'
  };
  
  console.log('\n🔍 예상 값과 비교:');
  let allMatch = true;
  Object.entries(expectedValues).forEach(([key, expected]) => {
    const actual = parsedWorkOrder[key];
    const match = actual === expected;
    if (!match) allMatch = false;
    console.log(`  ${key}: ${match ? '✅' : '❌'} ${actual} ${match ? '==' : '!='} ${expected}`);
  });
  
  console.log(`\n🎯 전체 테스트 결과: ${allMatch ? '✅ 성공' : '❌ 실패'}`);
}

testUpdatedParser();