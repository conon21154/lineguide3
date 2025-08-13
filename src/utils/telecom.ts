/**
 * 통신 관련 유틸리티 함수들
 */

/**
 * 회선번호를 정규화하여 문자열로 변환
 * 지수표기법(예: 4.37255E+11)을 일반 숫자 문자열로 변환
 */
export function normalizeCircuit(input: unknown): string {
  let s = String(input ?? '').trim();
  if (/^[+-]?\d+(\.\d+)?e[+-]?\d+$/i.test(s)) s = sciToPlain(s);
  s = s.replace(/[^\d]/g, '');
  return s;
}

/**
 * 지수표기법을 일반 숫자 문자열로 변환
 * 예: "4.37255E+11" -> "437255000000"
 */
function sciToPlain(str: string): string {
  // JavaScript Number 객체를 사용하여 정밀하게 변환
  const num = Number(str);
  if (!Number.isFinite(num)) return str;
  
  // 정수인 경우 정수 문자열로 반환
  if (Number.isInteger(num)) {
    return num.toString();
  }
  
  // 소수인 경우 정밀도를 유지하여 문자열로 변환
  return num.toFixed(20).replace(/\.?0+$/, '');
}

// 테스트 함수 (개발용)
export function testNormalizeCircuit() {
  console.log('🧪 회선번호 정규화 테스트:');
  console.log('입력: "4.37255160040E+11" -> 출력:', normalizeCircuit("4.37255160040E+11"));
  console.log('입력: "437255160040" -> 출력:', normalizeCircuit("437255160040"));
  console.log('입력: "4.37255E+11" -> 출력:', normalizeCircuit("4.37255E+11"));
  console.log('입력: "437255000000" -> 출력:', normalizeCircuit("437255000000"));
  
  // 추가 테스트
  console.log('입력: "4.37255160040E+11" (Number 변환):', Number("4.37255160040E+11"));
  console.log('입력: "4.37255E+11" (Number 변환):', Number("4.37255E+11"));
}
