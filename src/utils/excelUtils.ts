import * as XLSX from 'xlsx';
import { ResponseNoteData } from '@/types';
import { formatKSTDate } from './dateUtils';

// 엑셀 내보내기 가능한 컬럼 정의
export interface ExcelColumn {
  key: keyof ResponseNoteData | 'index';
  label: string;
  width?: number;
  formatter?: (value: any, data: ResponseNoteData) => string;
}

// 기본 엑셀 컬럼 설정
export const DEFAULT_EXCEL_COLUMNS: ExcelColumn[] = [
  { key: 'index', label: '번호', width: 8 },
  { key: 'workOrderId', label: '작업지시 ID', width: 15 },
  { key: 'side', label: '작업구분', width: 10 },
  { key: 'operationTeam', label: '운용팀', width: 12 },
  { key: 'ruId', label: 'RU ID', width: 15 },
  { 
    key: 'content', 
    label: '회신 내용', 
    width: 40,
    formatter: (value: string) => value?.replace(/\n/g, ' ') || '' // 줄바꿈 제거
  },
  { 
    key: 'createdAt', 
    label: '작성일시', 
    width: 20,
    formatter: (value: string) => formatKSTDate(value, true)
  },
  { 
    key: 'updatedAt', 
    label: '수정일시', 
    width: 20,
    formatter: (value: string) => value && value !== 'createdAt' ? formatKSTDate(value, true) : '—'
  }
];

// 컬럼 선택 옵션
export const COLUMN_OPTIONS = DEFAULT_EXCEL_COLUMNS.map(col => ({
  value: col.key,
  label: col.label,
  checked: true // 기본적으로 모든 컬럼 선택
}));

/**
 * 현장회신 데이터를 엑셀로 내보내기
 */
export const exportResponseNotesToExcel = (
  data: ResponseNoteData[],
  options: {
    filename?: string;
    selectedColumns?: string[];
    sheetName?: string;
  } = {}
) => {
  const {
    filename = `현장회신_${formatKSTDate(new Date(), false).replace(/\./g, '')}.xlsx`,
    selectedColumns = DEFAULT_EXCEL_COLUMNS.map(col => col.key),
    sheetName = '현장회신'
  } = options;

  // 선택된 컬럼만 필터링
  const columns = DEFAULT_EXCEL_COLUMNS.filter(col => 
    selectedColumns.includes(col.key as string)
  );

  // 데이터 변환
  const excelData = data.map((item, index) => {
    const row: any = {};
    
    columns.forEach(col => {
      if (col.key === 'index') {
        row[col.label] = index + 1;
      } else {
        const value = item[col.key as keyof ResponseNoteData];
        if (col.formatter) {
          row[col.label] = col.formatter(value, item);
        } else {
          row[col.label] = value || '';
        }
      }
    });
    
    return row;
  });

  // 워크북 생성
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);

  // 컬럼 폭 설정
  const colWidths = columns.map(col => ({ wch: col.width || 20 }));
  ws['!cols'] = colWidths;

  // 워크시트를 워크북에 추가
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // 파일 다운로드
  try {
    XLSX.writeFile(wb, filename);
    return { success: true, message: `엑셀 파일이 다운로드되었습니다: ${filename}` };
  } catch (error) {
    console.error('엑셀 내보내기 오류:', error);
    return { success: false, message: '엑셀 내보내기 중 오류가 발생했습니다.' };
  }
};

/**
 * CSV로 내보내기 (엑셀 대안)
 */
export const exportResponseNotesToCSV = (
  data: ResponseNoteData[],
  options: {
    filename?: string;
    selectedColumns?: string[];
  } = {}
) => {
  const {
    filename = `현장회신_${formatKSTDate(new Date(), false).replace(/\./g, '')}.csv`,
    selectedColumns = DEFAULT_EXCEL_COLUMNS.map(col => col.key),
  } = options;

  // 선택된 컬럼만 필터링
  const columns = DEFAULT_EXCEL_COLUMNS.filter(col => 
    selectedColumns.includes(col.key as string)
  );

  // CSV 헤더
  const headers = columns.map(col => col.label);
  
  // CSV 데이터
  const csvData = data.map((item, index) => {
    return columns.map(col => {
      if (col.key === 'index') {
        return index + 1;
      }
      
      const value = item[col.key as keyof ResponseNoteData];
      let formattedValue = '';
      
      if (col.formatter) {
        formattedValue = col.formatter(value, item);
      } else {
        formattedValue = String(value || '');
      }
      
      // CSV용 특수문자 이스케이프
      if (formattedValue.includes(',') || formattedValue.includes('"') || formattedValue.includes('\n')) {
        formattedValue = `"${formattedValue.replace(/"/g, '""')}"`;
      }
      
      return formattedValue;
    });
  });

  // CSV 문자열 생성
  const csvContent = [
    headers.join(','),
    ...csvData.map(row => row.join(','))
  ].join('\n');

  // BOM 추가 (한글 깨짐 방지)
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // 다운로드
  try {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return { success: true, message: `CSV 파일이 다운로드되었습니다: ${filename}` };
  } catch (error) {
    console.error('CSV 내보내기 오류:', error);
    return { success: false, message: 'CSV 내보내기 중 오류가 발생했습니다.' };
  }
};

/**
 * 요약 통계를 포함한 엑셀 내보내기
 */
export const exportResponseNotesWithSummary = (
  data: ResponseNoteData[],
  options: {
    filename?: string;
    selectedColumns?: string[];
  } = {}
) => {
  const {
    filename = `현장회신_요약_${formatKSTDate(new Date(), false).replace(/\./g, '')}.xlsx`,
    selectedColumns = DEFAULT_EXCEL_COLUMNS.map(col => col.key),
  } = options;

  // 기본 데이터 시트
  const detailResult = exportResponseNotesToExcel(data, {
    filename: 'temp.xlsx', // 임시 파일명
    selectedColumns,
    sheetName: '상세 데이터'
  });

  if (!detailResult.success) {
    return detailResult;
  }

  // 요약 통계 생성
  const teamStats: { [team: string]: number } = {};
  const sideStats: { [side: string]: number } = {};
  
  data.forEach(item => {
    // 팀별 통계
    teamStats[item.operationTeam] = (teamStats[item.operationTeam] || 0) + 1;
    // 작업구분별 통계
    sideStats[item.side] = (sideStats[item.side] || 0) + 1;
  });

  const summaryData = [
    { '항목': '총 회신 수', '값': data.length },
    { '항목': '', '값': '' },
    { '항목': '=== 팀별 통계 ===', '값': '' },
    ...Object.entries(teamStats).map(([team, count]) => ({
      '항목': team,
      '값': count
    })),
    { '항목': '', '값': '' },
    { '항목': '=== 작업구분별 통계 ===', '값': '' },
    ...Object.entries(sideStats).map(([side, count]) => ({
      '항목': side,
      '값': count
    }))
  ];

  // 워크북 재생성 (요약 포함)
  const wb = XLSX.utils.book_new();
  
  // 요약 시트 추가
  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  summaryWs['!cols'] = [{ wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, '요약');

  // 상세 데이터 시트 추가
  const columns = DEFAULT_EXCEL_COLUMNS.filter(col => 
    selectedColumns.includes(col.key as string)
  );

  const excelData = data.map((item, index) => {
    const row: any = {};
    columns.forEach(col => {
      if (col.key === 'index') {
        row[col.label] = index + 1;
      } else {
        const value = item[col.key as keyof ResponseNoteData];
        if (col.formatter) {
          row[col.label] = col.formatter(value, item);
        } else {
          row[col.label] = value || '';
        }
      }
    });
    return row;
  });

  const detailWs = XLSX.utils.json_to_sheet(excelData);
  const colWidths = columns.map(col => ({ wch: col.width || 20 }));
  detailWs['!cols'] = colWidths;
  XLSX.utils.book_append_sheet(wb, detailWs, '상세 데이터');

  // 파일 다운로드
  try {
    XLSX.writeFile(wb, filename);
    return { success: true, message: `엑셀 파일(요약 포함)이 다운로드되었습니다: ${filename}` };
  } catch (error) {
    console.error('엑셀 내보내기 오류:', error);
    return { success: false, message: '엑셀 내보내기 중 오류가 발생했습니다.' };
  }
};