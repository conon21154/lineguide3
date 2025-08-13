/**
 * 통신 관련 유틸리티 함수들
 */

/**
 * 회선번호를 정규화하여 문자열로 변환
 * 지수표기법(예: 4.37255E+11)을 일반 숫자 문자열로 변환
 */
function normalizeCircuit(input) {
  let s = String(input ?? '').trim();
  if (/^[+-]?\d+(\.\d+)?e[+-]?\d+$/i.test(s)) s = sciToPlain(s);
  s = s.replace(/[^\d]/g, '');
  return s;
}

/**
 * 지수표기법을 일반 숫자 문자열로 변환
 * 예: "4.37255E+11" -> "437255000000"
 */
function sciToPlain(str) {
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

module.exports = {
  normalizeCircuit,
  sciToPlain
};
