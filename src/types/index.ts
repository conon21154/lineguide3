export type WorkOrderStatus = 'pending' | 'in_progress' | 'completed';

export type OperationTeam = 
  | '울산T'
  | '동부산T'
  | '중부산T'
  | '서부산T'
  | '김해T'
  | '창원T'
  | '진주T'
  | '통영T'
  | '지하철T'
  | '기타';

// RU 정보 인터페이스
export interface RuInfo {
  ruId: string;                       // RU_ID
  ruName: string;                     // RU명 (장비명)
  channelCard?: string;               // 채널카드
  port?: string;                      // 포트
}

export interface WorkOrder {
  id: string;
  managementNumber: string;           // 관리번호 (A열: 25_인빌딩_0211)
  requestDate: string;                // 작업요청일 (C열: 08월06일(수) 내)
  operationTeam: OperationTeam;       // DU측 운용팀 (D열: 서부산T)
  ruOperationTeam?: OperationTeam;    // RU측 운용팀 (F열: 서부산T)
  representativeRuId?: string;        // 대표 RU_ID (I열: NPPS01491S)
  coSiteCount5G?: string;             // 5G CO-SITE수량 (K열: 1)
  concentratorName5G: string;         // 5G 집중국명 (L열: 서부산망(안))
  equipmentType: string;              // 장비구분 (MUX 등)
  equipmentName: string;              // 장비명 (대표RU명)
  category: string;                   // MUX 종류 (Q열: 10G_3CH)
  serviceType: string;                // 서비스구분 ([열: CH4)
  duId: string;                       // DU ID (\열: NS00260284)
  duName: string;                     // DU명 (]열: 서부산망(안)-01-02(5G))
  channelCard: string;                // 채널카드 (^열: 2)
  port: string;                       // 포트 (_열: 8)
  lineNumber: string;                 // 선번장 (P열: LTE MUX : B0833-06-17...)
  // 여러 RU 정보 배열 (CO-SITE 수량만큼)
  ruInfoList?: RuInfo[];              // RU 정보 목록 (A, B, G 등)
  status: WorkOrderStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  notes?: string;
  photos?: string[];
  // 현장 회신 메모 관련 필드
  responseNote?: ResponseNote;
}

// 현장 회신 메모 인터페이스
export interface ResponseNote {
  ruOpticalSignal?: string;           // RU 광신호 유/무
  mux5G?: string;                     // 5G MUX
  tie5GLine?: string;                 // 5G TIE 선번
  specialNotes?: string;              // 특이사항
  updatedAt: string;                  // 회신 메모 작성/수정 시간
  adminChecked?: boolean;             // 관리자 확인 여부
  adminCheckedAt?: string;            // 관리자 확인 시간
}

// 16개 필수 항목을 위한 새로운 타입 (회선번호 추가)
export interface ExtractedWorkOrderData {
  관리번호: string;
  작업요청일: string;
  작업구분: string; // 'DU측' 또는 'RU측'
  DU측_운용팀: OperationTeam;
  RU측_운용팀: OperationTeam;
  대표_RU_ID: string;
  대표_RU_명: string;
  "5G_Co_Site_수량": string;
  "5G_집중국명": string;
  회선번호: string;
  선번장: string;
  종류: string;
  서비스_구분: string;
  DU_ID: string;
  DU_명: string;
  채널카드: string;
  포트_A: string;
}

export interface ExcelParseResult {
  success: boolean;
  data: ExtractedWorkOrderData[];
  errors: string[];
  isUploaded?: boolean;
}

export interface WorkOrderFilter {
  operationTeam?: OperationTeam;
  status?: WorkOrderStatus;
  dateRange?: {
    start: string;
    end: string;
  };
  searchTerm?: string;
}