import { describe, test, expect } from 'vitest';
import {
  generateDuTemplate,
  generateRuTemplate,
  generateTemplate,
  substituteTemplate,
  createInitialDuFields,
  createInitialRuFields,
  DU_TEMPLATE,
  RU_TEMPLATE,
  type DuFormFields,
  type RuFormFields
} from '../memoTemplate';

describe('memoTemplate', () => {
  describe('substituteTemplate', () => {
    test('모든 플레이스홀더를 올바르게 치환한다', () => {
      const template = '안녕하세요 ${name}님, 나이는 ${age}세입니다. ${missing}은 비어있습니다.';
      const values = {
        name: '홍길동',
        age: 30,
        missing: undefined
      };

      const result = substituteTemplate(template, values);
      
      expect(result).toBe('안녕하세요 홍길동님, 나이는 30세입니다. 은 비어있습니다.');
    });

    test('특수 문자가 포함된 플레이스홀더도 안전하게 치환한다', () => {
      const template = '금액: ${amount}원, 비율: ${rate}%';
      const values = {
        amount: '1,000',
        rate: '10.5'
      };

      const result = substituteTemplate(template, values);
      
      expect(result).toBe('금액: 1,000원, 비율: 10.5%');
    });
  });

  describe('generateDuTemplate', () => {
    test('DU측 템플릿을 올바르게 생성한다', () => {
      const fields: DuFormFields = {
        operationTeam: '울산T',
        managementNumber: 'TEST001_DU측',
        duName: '울산중앙DU',
        signalYN: '유',
        mux: '정상',
        tie: 'TIE-001',
        note: '작업 완료'
      };

      const result = generateDuTemplate(fields);
      
      // 스냅샷 테스트: 정확한 형식 확인
      const expected = `[울산T DU측]
ㅇ 관리번호 : TEST001_DU측
ㅇ 국사 명 : 울산중앙DU
ㅇ RU 광신호 유/무 : 유
ㅇ 5G MUX : 정상
ㅇ 5G TIE 선번 : TIE-001
ㅇ 특이사항 : 작업 완료`;

      expect(result).toBe(expected);
    });

    test('빈 값들이 있어도 템플릿 구조는 유지된다', () => {
      const fields: DuFormFields = {
        operationTeam: '울산T',
        managementNumber: 'TEST001_DU측',
        duName: '',
        signalYN: '',
        mux: '',
        tie: '',
        note: ''
      };

      const result = generateDuTemplate(fields);
      
      // 라벨과 구두점, 개행이 모두 유지되는지 확인
      expect(result).toContain('ㅇ 관리번호 : TEST001_DU측');
      expect(result).toContain('ㅇ 국사 명 : ');
      expect(result).toContain('ㅇ RU 광신호 유/무 : ');
      expect(result).toContain('ㅇ 5G MUX : ');
      expect(result).toContain('ㅇ 5G TIE 선번 : ');
      expect(result).toContain('ㅇ 특이사항 : ');
      
      // 정확한 줄 수 확인
      expect(result.split('\n')).toHaveLength(7);
    });
  });

  describe('generateRuTemplate', () => {
    test('RU측 템플릿을 올바르게 생성한다', () => {
      const fields: RuFormFields = {
        operationTeam: '부산T',
        managementNumber: 'TEST001_RU측',
        ruName: 'RU-001',
        coSiteCount5g: '3',
        muxInstallYN: '유',
        mux: 'MUX-001',
        tie: 'TIE-RU-001',
        lteMux: 'LTE-001',
        note: '설치 완료'
      };

      const result = generateRuTemplate(fields);
      
      // 스냅샷 테스트: 정확한 형식 확인
      const expected = `[부산T RU측]
ㅇ 관리번호 : TEST001_RU측
ㅇ 국사명 : RU-001
ㅇ 5G Co-site 수량 : 3식
ㅇ 5G MUX 설치유무 : 유
ㅇ 5G MUX 선번 : MUX-001
ㅇ 5G TIE 선번 : TIE-RU-001
ㅇ LTE MUX : LTE-001
ㅇ 특이사항 : 설치 완료`;

      expect(result).toBe(expected);
    });

    test('Co-site 수량이 빈값이어도 "식" 단위는 유지된다', () => {
      const fields: RuFormFields = {
        operationTeam: '부산T',
        managementNumber: 'TEST001_RU측',
        ruName: 'RU-001',
        coSiteCount5g: '', // 빈값
        muxInstallYN: '유',
        mux: 'MUX-001',
        tie: 'TIE-RU-001',
        lteMux: 'LTE-001',
        note: '설치 완료'
      };

      const result = generateRuTemplate(fields);
      
      // "식" 문자가 유지되는지 확인
      expect(result).toContain('ㅇ 5G Co-site 수량 : 식');
      expect(result.split('\n')).toHaveLength(9);
    });
  });

  describe('generateTemplate', () => {
    test('side에 따라 올바른 템플릿을 선택한다', () => {
      const duFields: DuFormFields = {
        operationTeam: '울산T',
        managementNumber: 'TEST001_DU측',
        duName: '울산중앙DU',
        signalYN: '유',
        mux: '정상',
        tie: 'TIE-001',
        note: '작업 완료'
      };

      const ruFields: RuFormFields = {
        operationTeam: '부산T',
        managementNumber: 'TEST001_RU측',
        ruName: 'RU-001',
        coSiteCount5g: '3',
        muxInstallYN: '유',
        mux: 'MUX-001',
        tie: 'TIE-RU-001',
        lteMux: 'LTE-001',
        note: '설치 완료'
      };

      const duResult = generateTemplate('DU측', duFields);
      const ruResult = generateTemplate('RU측', ruFields);

      expect(duResult).toContain('[울산T DU측]');
      expect(duResult).toContain('ㅇ RU 광신호 유/무 : 유');
      
      expect(ruResult).toContain('[부산T RU측]');
      expect(ruResult).toContain('ㅇ 5G MUX 설치유무 : 유');
      expect(ruResult).toContain('ㅇ LTE MUX : LTE-001');
    });
  });

  describe('createInitialFields', () => {
    test('DU측 초기 필드를 올바르게 생성한다', () => {
      const baseInfo = {
        operationTeam: '울산T',
        managementNumber: 'TEST001_DU측',
        duName: '울산중앙DU'
      };

      const result = createInitialDuFields(baseInfo);

      expect(result).toEqual({
        operationTeam: '울산T',
        managementNumber: 'TEST001_DU측',
        duName: '울산중앙DU',
        signalYN: '',
        mux: '',
        tie: '',
        note: ''
      });
    });

    test('RU측 초기 필드를 올바르게 생성한다', () => {
      const baseInfo = {
        operationTeam: '부산T',
        managementNumber: 'TEST001_RU측',
        ruName: 'RU-001',
        coSiteCount5g: 3
      };

      const result = createInitialRuFields(baseInfo);

      expect(result).toEqual({
        operationTeam: '부산T',
        managementNumber: 'TEST001_RU측',
        ruName: 'RU-001',
        coSiteCount5g: '3',
        muxInstallYN: '',
        mux: '',
        tie: '',
        lteMux: '',
        note: ''
      });
    });

    test('null 값들을 적절히 처리한다', () => {
      const baseInfo = {
        operationTeam: '울산T',
        managementNumber: 'TEST001_RU측',
        ruName: null,
        coSiteCount5g: null
      };

      const result = createInitialRuFields(baseInfo);

      expect(result.ruName).toBe('');
      expect(result.coSiteCount5g).toBe('');
    });
  });

  describe('템플릿 상수 검증', () => {
    test('DU_TEMPLATE이 올바른 형식을 가진다', () => {
      // 필수 라벨들이 모두 포함되어야 함
      expect(DU_TEMPLATE).toContain('ㅇ 관리번호 : ${managementNumber}');
      expect(DU_TEMPLATE).toContain('ㅇ 국사 명 : ${duName}');
      expect(DU_TEMPLATE).toContain('ㅇ RU 광신호 유/무 : ${signalYN}');
      expect(DU_TEMPLATE).toContain('ㅇ 5G MUX : ${mux}');
      expect(DU_TEMPLATE).toContain('ㅇ 5G TIE 선번 : ${tie}');
      expect(DU_TEMPLATE).toContain('ㅇ 특이사항 : ${note}');
      
      // 정확한 줄 수
      expect(DU_TEMPLATE.split('\n')).toHaveLength(7);
    });

    test('RU_TEMPLATE이 올바른 형식을 가진다', () => {
      // 필수 라벨들이 모두 포함되어야 함
      expect(RU_TEMPLATE).toContain('ㅇ 관리번호 : ${managementNumber}');
      expect(RU_TEMPLATE).toContain('ㅇ 국사명 : ${ruName}');
      expect(RU_TEMPLATE).toContain('ㅇ 5G Co-site 수량 : ${coSiteCount5g}식');
      expect(RU_TEMPLATE).toContain('ㅇ 5G MUX 설치유무 : ${muxInstallYN}');
      expect(RU_TEMPLATE).toContain('ㅇ 5G MUX 선번 : ${mux}');
      expect(RU_TEMPLATE).toContain('ㅇ 5G TIE 선번 : ${tie}');
      expect(RU_TEMPLATE).toContain('ㅇ LTE MUX : ${lteMux}');
      expect(RU_TEMPLATE).toContain('ㅇ 특이사항 : ${note}');
      
      // 정확한 줄 수
      expect(RU_TEMPLATE.split('\n')).toHaveLength(9);
    });
  });
});