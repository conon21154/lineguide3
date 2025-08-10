// 템플릿 상수 (절대 변경 금지)
export const DU_TEMPLATE = `[\${operationTeam} DU측]
ㅇ 관리번호 : \${managementNumber}
ㅇ 국사 명 : \${duName}
ㅇ RU 광신호 유/무 : \${signalYN}
ㅇ 5G MUX : \${mux}
ㅇ 5G TIE 선번 : \${tie}
ㅇ 특이사항 : \${note}`;

export const RU_TEMPLATE = `[\${operationTeam} RU측]
ㅇ 관리번호 : \${managementNumber}
ㅇ 국사명 : \${ruName}
ㅇ 5G Co-site 수량 : \${coSiteCount5g}식
ㅇ 5G MUX 설치유무 : \${muxInstallYN}
ㅇ 5G MUX 선번 : \${mux}
ㅇ 5G TIE 선번 : \${tie}
ㅇ LTE MUX : \${lteMux}
ㅇ 특이사항 : \${note}`;

// DU측 입력 필드 타입
export interface DuFormFields {
  operationTeam: string;
  managementNumber: string;
  duName: string;
  signalYN: string;
  mux: string;
  tie: string;
  note: string;
}

// RU측 입력 필드 타입
export interface RuFormFields {
  operationTeam: string;
  managementNumber: string;
  ruName: string;
  coSiteCount5g: string;
  muxInstallYN: string;
  mux: string;
  tie: string;
  lteMux: string;
  note: string;
}

// 템플릿 치환 함수
export function substituteTemplate(
  template: string,
  values: Record<string, string | number | null | undefined>
): string {
  let result = template;
  
  // 모든 ${key} 형태를 찾아서 치환
  for (const [key, value] of Object.entries(values)) {
    const placeholder = `\${${key}}`;
    const replacement = value?.toString() || '';
    result = result.replace(new RegExp(escapeRegExp(placeholder), 'g'), replacement);
  }
  
  return result;
}

// 정규식 특수문자 이스케이프
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// DU측 템플릿 생성
export function generateDuTemplate(fields: DuFormFields): string {
  return substituteTemplate(DU_TEMPLATE, fields);
}

// RU측 템플릿 생성
export function generateRuTemplate(fields: RuFormFields): string {
  return substituteTemplate(RU_TEMPLATE, fields);
}

// 측면에 따른 템플릿 선택 및 생성
export function generateTemplate(
  side: 'DU측' | 'RU측',
  fields: DuFormFields | RuFormFields
): string {
  if (side === 'DU측') {
    return generateDuTemplate(fields as DuFormFields);
  } else {
    return generateRuTemplate(fields as RuFormFields);
  }
}

// 선택 옵션 상수
export const SIGNAL_OPTIONS = [
  { value: '', label: '선택하세요' },
  { value: '유', label: '유' },
  { value: '무', label: '무' },
  { value: '미확인', label: '미확인' }
];

export const MUX_INSTALL_OPTIONS = [
  { value: '', label: '선택하세요' },
  { value: '유', label: '유' },
  { value: '무', label: '무' },
  { value: '미확인', label: '미확인' }
];

// 폼 필드 초기값 생성
export function createInitialDuFields(baseInfo?: {
  operationTeam: string;
  managementNumber: string;
  duName: string | null;
}): DuFormFields {
  return {
    operationTeam: baseInfo?.operationTeam || '',
    managementNumber: baseInfo?.managementNumber || '',
    duName: baseInfo?.duName || '',
    signalYN: '',
    mux: '',
    tie: '',
    note: ''
  };
}

export function createInitialRuFields(baseInfo?: {
  operationTeam: string;
  managementNumber: string;
  ruName: string | null;
  coSiteCount5g: number | null;
}): RuFormFields {
  return {
    operationTeam: baseInfo?.operationTeam || '',
    managementNumber: baseInfo?.managementNumber || '',
    ruName: baseInfo?.ruName || '',
    coSiteCount5g: baseInfo?.coSiteCount5g?.toString() || '',
    muxInstallYN: '',
    mux: '',
    tie: '',
    lteMux: '',
    note: ''
  };
}