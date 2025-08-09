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
  ruId: string;
  ruName?: string;
  channelCard?: string;
  port?: string;
}

// MUX 정보 인터페이스
export interface MuxInfo {
  lteMux?: string;
  muxType?: string;
  서비스구분?: string;
}

export interface WorkOrder {
  id: string;
  managementNumber: string;
  requestDate?: string;
  operationTeam: string;
  
  equipmentType?: string;
  equipmentName?: string;
  category?: string;
  serviceLocation?: string;
  serviceType?: string;
  
  concentratorName5G?: string;
  coSiteCount5G?: string;
  
  ruInfoList?: RuInfo[];
  representativeRuId?: string;
  
  muxInfo?: MuxInfo;
  lineNumber?: string;
  
  duId?: string;
  duName?: string;
  channelCard?: string;
  port?: string;
  
  workType?: 'DU측' | 'RU측';
  status: WorkOrderStatus;
  notes?: string;
  
  createdAt: number | string;
  updatedAt: number | string;
  completedAt?: number | string;
  
  responseNote?: {
    concentratorName?: string;
    coSiteCount5G?: string;
    mux5GInstallation?: string;
    mux5GLineNumber?: string;
    tie5GLineNumber?: string;
    lteMux?: string;
    localStationName?: string;
    duOpticalSignal?: string;
    specialNotes?: string;
  };
}

// 현장 회신 메모 인터페이스
export interface ResponseNote {
  // DU측 회신 메모 필드
  concentratorName?: string;          // 국사명 (DU측)
  coSiteCount5G?: string;             // 5G Co-site 수량 (DU측)
  mux5GInstallation?: string;         // 5G MUX 설치유무 (DU측)
  mux5GLineNumber?: string;           // 5G MUX 선번 (DU측)
  tie5GLineNumber?: string;           // 5G TIE 선번 (DU측)
  lteMux?: string;                    // LTE MUX (DU측)
  
  // RU측 회신 메모 필드
  localStationName?: string;          // 국소명 (RU측)
  duOpticalSignal?: string;           // DU 광신호 유/무 (RU측)
  
  // 공통 필드
  specialNotes?: string;              // 특이사항
  updatedAt: string;                  // 회신 메모 작성/수정 시간
  adminChecked?: boolean;             // 관리자 확인 여부
  adminCheckedAt?: string;            // 관리자 확인 시간
}

// CSV 파일에서 파싱된 작업지시 데이터 인터페이스
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
  // 추가 필드들
  구분: string;        // 구분 (RT 2군 / COT 신설 등)
  협력사: string;      // 협력사
  협력사2: string;     // 협력사2
  건물명: string;      // 건물명
  장비위치: string;    // 장비위치
  주소: string;        // 조합된 주소 정보
  비고: string;        // 비고
  DU담당자: string;    // DU담당자
  RU담당자: string;    // RU담당자
  MUX분출여부: string; // MUX분출여부 (칼럼 24번)
  MUX종류2: string;    // MUX종류2 (칼럼 25번)
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

// DU-BAY-FDF 매핑 인터페이스
export interface DuMappingData {
  duName: string;    // DU명 (예: 중부산-00-00(5G))
  bay: string;       // BAY (예: B0210)
  fdf: string;       // FDF (예: FDF-1)
}

// 라벨 프린터 전용 데이터 인터페이스
export interface LabelPrintData {
  equipmentId: string;      // 장비ID (예: NPPS03608S)
  duName: string;          // DU명 (예: 녹산R2(분기)-01-03(5G))
  channelCard: string;     // 채널카드
  port: string;            // 포트
  bay: string;             // BAY 정보
  fdf: string;             // FDF 정보
  equipmentName: string;   // 장비명
  mux5GInfo?: string;      // 5G MUX 정보 (현장 입력)
}

