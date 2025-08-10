import { useState, useEffect, useMemo, useRef } from 'react'
import { Printer, Search, BarChart3, Smartphone, Copy, CheckCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { apiGet, API_ENDPOINTS } from '@/config/api'
import { useQuery } from '@tanstack/react-query'

// 라벨 타입 정의
type LabelType = 'A' | 'B' | 'C'

// 2x2 셀 구조
type LabelCells = {
  left1: string
  left2: string
  right1: string
  right2: string
}

// 라벨 데이터 타입 (API 응답)
type LabelData = {
  managementNumber: string
  requestDate: string
  duTeam: string
  ruTeam: string
  ruId: string
  ruName: string
  focus5gName: string
  lineNumber: string
  lteMux: string // (LTE MUX / 국간,간선망)
  equipmentLocation: string
  muxType: string
  serviceType: string
  duId: string
  duName: string
  channelCard: string
  port: string
}

// 사용자 입력 값들 (타입 간 연동용) - 단일 상태 원천
type UserInputs = {
  muxA: string  // A에서 입력 → B.Left1에 사용
  tieB: string  // B에서 입력 → C.Left1에 사용
  lteMuxC: string // DB 기본값, C 우측1열
}

// DU 작업지시 간략 정보
type DUBrief = {
  id: number;
  managementNumber: string;
  duidFinal: string;     // duId + '-' + port
  lteMuxFull: string;    // "(LTE MUX/국간·간선망)" 칼럼 값 그대로
};

// 라벨 규격 (PT-P300BT 12mm TZe 기준)
const LABEL_SPECS = {
  width: 138,   // mm
  height: 12,   // mm
  dpi: 180,     // PT-P300BT DPI
  maxLineWidth: 930, // px (좌우 47px 마진)
  margin: { left: 24, right: 24, top: 12, bottom: 12 }
}

// mm to px 변환 함수
const mmToPx = (mm: number) => Math.round(mm * LABEL_SPECS.dpi / 25.4)

// 유틸 함수들 (요구사항에 따라 정확히 구현)
const MM2PX = (mm: number) => Math.round(mm * 180 / 25.4)
const WIDTH = MM2PX(138)      // 977
const MAX = WIDTH - 47 * 2    // 930
const FONT = "14px 'Roboto Mono', monospace"

function ellipsizeToWidth(s: string, maxPx: number, ctx: CanvasRenderingContext2D): string {
  if (!s) return ''
  if (ctx.measureText(s).width <= maxPx) return s
  let lo = 0, hi = s.length
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2)
    if (ctx.measureText(s.slice(0, mid) + '…').width <= maxPx) lo = mid; else hi = mid - 1
  }
  return s.slice(0, lo) + '…'
}

function padBetween(left: string, right: string, maxPx: number, ctx: CanvasRenderingContext2D): string {
  const spaceW = ctx.measureText(' ').width || 6
  const leftW = ctx.measureText(left).width
  const rightW = ctx.measureText(right).width
  const gapPx = Math.max(0, maxPx - leftW - rightW)
  const spaces = Math.max(1, Math.floor(gapPx / spaceW))
  return left + ' '.repeat(spaces) + right
}

function buildTwoLine({ L1, L2, R1, R2 }: { L1: string; L2: string; R1: string; R2: string }): string {
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d')!
  ctx.font = FONT
  const L1_ = ellipsizeToWidth(L1, Math.floor(MAX * 0.65), ctx)
  const R1_ = ellipsizeToWidth(R1, Math.floor(MAX * 0.45), ctx)
  const L2_ = ellipsizeToWidth(L2, Math.floor(MAX * 0.65), ctx)
  const R2_ = ellipsizeToWidth(R2, Math.floor(MAX * 0.45), ctx)
  const line1 = padBetween(L1_, R1_, MAX, ctx)
  const line2 = padBetween(L2_, R2_, MAX, ctx)
  return line1 + '\n' + line2
}


// DU 작업지시 매핑 함수
function mapDU(raw: any): DUBrief {
  // 디버깅을 위한 로그 추가
  console.log('🔍 mapDU 입력 데이터:', raw);
  
  // 올바른 필드들 추출 - DU명 + 채널카드 + 포트 조합
  const duName = raw.duName ?? raw.du_name ?? raw['DU명'] ?? raw['du_name'] ?? '';
  const channelCard = raw.channelCard ?? raw.channel_card ?? raw['채널카드'] ?? raw['channel_card'] ?? '';
  const port = raw.port ?? raw.portNumber ?? raw['포트'] ?? raw.port_number ?? '';
  
  console.log('🔍 추출된 값:', { duName, channelCard, port });
  
  // DU명 + 채널카드 + 포트 조합 (하이픈으로 연결)
  const duidFinal = [duName, channelCard, port].filter(Boolean).join('-');
  
  const lteMux =
    raw.lteMux ??
    raw['(LTE MUX / 국간,간선망)'] ??
    raw['(LTE MUX/국간·간선망)'] ??
    raw?.mux_info?.lteMux ?? '';

  const result = {
    id: raw.id,
    managementNumber: raw.managementNumber ?? raw['관리번호'] ?? '',
    duidFinal: duidFinal,
    lteMuxFull: String(lteMux || '')
  };
  
  console.log('🔍 mapDU 결과:', result);
  return result;
}

// 라벨 타입별 2×2 셀 매핑 (고정된 매핑 + 접미 지원)
const getLabelMapping = (
  type: LabelType, 
  labelData: LabelData | null, 
  userInputs: UserInputs | null,
  muxSuffix: string,
  tieSuffix: string,
  lteMuxSuffix: string,
  duidFinal: string,
  managementNumber: string
): LabelCells => {
  try {
    if (!userInputs) {
      return { left1: '', left2: '', right1: '', right2: '' }
    }
  
    // 접미어 결합 함수
    function withSuf(v: string, suf?: string) { 
      const s = (suf ?? '').trim(); 
      return v + (s ? s : ''); 
    }

         // 타입별 2×2 매핑 "고정" + 접미어
     const left1 =
       type === 'A' ? `${duidFinal}` :
       type === 'B' ? withSuf(`5G MUX ${userInputs.muxA ?? ''}`, muxSuffix) :
                      withSuf(`5G TIE ${userInputs.tieB ?? ''}`, tieSuffix);

     const left2 =
       type === 'A' ? `${labelData?.ruName ?? labelData?.duName ?? ''}` :
                      `${labelData?.duTeam ?? ''}`;

    const right1 =
      type === 'A' ? withSuf(`5G MUX ${userInputs.muxA ?? ''}`, muxSuffix) :
      type === 'B' ? withSuf(`5G TIE ${userInputs.tieB ?? ''}`, tieSuffix) :
                     withSuf(`LTE MUX ${userInputs.lteMuxC ?? ''}`, lteMuxSuffix);

    const right2 = `${labelData?.duTeam ?? ''}`;

    return {
      left1: left1.trim(),
      left2: left2.trim(),
      right1: right1.trim(),
      right2: right2.trim()
    }
  } catch (error) {
    console.error('getLabelMapping 오류:', error, { type, labelData, userInputs })
    return { left1: '', left2: '', right1: '', right2: '' }
  }
}

// 2x2 셀 검증 함수 (접미 입력 고려)
const validateLabelCells = (
  cells: LabelCells, 
  type: LabelType, 
  muxA: string, 
  tieB: string, 
  lteMuxC: string
): { isValid: boolean; message?: string; focusField?: string } => {
  // 타입별 필수 입력 검증
  if (type === 'A') {
    if (!muxA?.trim()) {
      return { isValid: false, message: '5G MUX를 입력하세요', focusField: 'muxA' }
    }
  } else if (type === 'B') {
    if (!muxA?.trim() && !tieB?.trim()) {
      return { isValid: false, message: '5G MUX 또는 5G TIE 중 하나는 입력하세요', focusField: 'tieB' }
    }
  } else if (type === 'C') {
    if (!tieB?.trim() && !lteMuxC?.trim()) {
      return { isValid: false, message: '5G TIE 또는 LTE MUX 중 하나는 입력하세요', focusField: 'lteMuxC' }
    }
  }
  
  return { isValid: true }
}

// 라벨 타입 선택 컴포넌트
const LabelTypeSelector = ({ 
  selectedType, 
  onTypeChange 
}: { 
  selectedType: LabelType
  onTypeChange: (type: LabelType) => void 
}) => {
  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-slate-700 mb-3">라벨 타입</label>
      <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
        {(['A', 'B', 'C'] as LabelType[]).map((type) => (
          <button
            key={type}
            onClick={() => onTypeChange(type)}
            className={`h-9 md:h-10 px-3 md:px-4 rounded-lg text-sm font-medium text-slate-600
              data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E60012]/30
              transition ${
              selectedType === type
                ? 'bg-white text-slate-900 shadow-sm'
                : 'hover:text-slate-700'
            }`}
          >
            타입 {type}
          </button>
        ))}
      </div>
      <div className="mt-2 text-xs text-slate-600">
        {selectedType === 'A' && '장비 ID + 장비명 / 5G MUX + 운용팀'}
        {selectedType === 'B' && '5G MUX + 5G TIE / 운용팀 (A→B 연동)'}
        {selectedType === 'C' && '5G TIE + LTE MUX / 운용팀 (B→C 연동)'}
      </div>
    </div>
  )
}

// 2x2 셀 입력 컴포넌트 (접미 입력 지원)
const CellInputs = ({ 
  cells, 
  inputRefs,
  type,
  muxA,
  setMuxA,
  muxSuffix,
  setMuxSuffix,
  tieB,
  setTieB,
  tieSuffix,
  setTieSuffix,
  lteMuxC,
  setLteMuxC,
  lteMuxSuffix,
  setLteMuxSuffix
}: { 
  cells: LabelCells
  inputRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | null }>
  type: LabelType
  muxA: string
  setMuxA: (value: string) => void
  muxSuffix: string
  setMuxSuffix: (value: string) => void
  tieB: string
  setTieB: (value: string) => void
  tieSuffix: string
  setTieSuffix: (value: string) => void
  lteMuxC: string
  setLteMuxC: (value: string) => void
  lteMuxSuffix: string
  setLteMuxSuffix: (value: string) => void
}) => {
  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-slate-700 mb-3">라벨 정보 입력</div>
      
      {/* A 타입 입력 */}
      {type === 'A' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                5G MUX
              </label>
              <input
                type="text"
                placeholder="예: B0833-06-17"
                value={muxA}
                onChange={(e) => setMuxA(e.target.value)}
                className="w-full h-11 rounded-lg border-slate-300 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#E60012]/30 focus-visible:border-[#E60012] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                MUX 접미
              </label>
              <input
                type="text"
                placeholder="예:  - 210 BAY 111"
                value={muxSuffix}
                onChange={(e) => setMuxSuffix(e.target.value)}
                className="w-full h-11 rounded-lg border-slate-300 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#E60012]/30 focus-visible:border-[#E60012] text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* B 타입 입력 */}
      {type === 'B' && (
        <div className="space-y-3">
          <div className="bg-slate-50 p-2 rounded-md">
            <div className="text-xs text-slate-700">
              A의 MUX + 접미가 자동 반영됩니다
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                5G TIE
              </label>
              <input
                type="text"
                placeholder="예: TIE03-180"
                value={tieB}
                onChange={(e) => setTieB(e.target.value)}
                className="w-full h-11 rounded-lg border-slate-300 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#E60012]/30 focus-visible:border-[#E60012] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                TIE 접미
              </label>
              <input
                type="text"
                placeholder="예:  - PORT 10"
                value={tieSuffix}
                onChange={(e) => setTieSuffix(e.target.value)}
                className="w-full h-11 rounded-lg border-slate-300 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#E60012]/30 focus-visible:border-[#E60012] text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* C 타입 입력 */}
      {type === 'C' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                LTE MUX/국간·간선망
              </label>
              <input
                type="text"
                placeholder="예: LTE MUX 값"
                value={lteMuxC}
                onChange={(e) => setLteMuxC(e.target.value)}
                className="w-full h-11 rounded-lg border-slate-300 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#E60012]/30 focus-visible:border-[#E60012] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                LTE MUX 접미 (선택)
              </label>
              <input
                type="text"
                placeholder="예:  - 추가 정보"
                value={lteMuxSuffix}
                onChange={(e) => setLteMuxSuffix(e.target.value)}
                className="w-full h-11 rounded-lg border-slate-300 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#E60012]/30 focus-visible:border-[#E60012] text-sm"
              />
            </div>
          </div>
        </div>
      )}
      
      <div className="text-xs text-slate-500">
        최소 하나 이상의 필수 항목을 입력해주세요
      </div>
    </div>
  )
}

// HiDPI 캔버스 설정 함수
function setupCanvas(canvas: HTMLCanvasElement, cssW: number, cssH: number) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.width  = cssW + 'px';
  canvas.style.height = cssH + 'px';
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  return ctx;
}

// Canvas 기반 2행 라벨 미리보기 컴포넌트
const LabelPreview = ({ 
  cells
}: { 
  cells: LabelCells
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [showLargeText, setShowLargeText] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // 실시간으로 labelText 계산
    const labelText = buildTwoLine({ L1: cells.left1, L2: cells.left2, R1: cells.right1, R2: cells.right2 })

    // CSS 표시 크기 (확대 표시용) - 너비를 늘려서 좌우 텍스트가 모두 보이도록
    const displayWidth = showLargeText ? 800 : 600
    const displayHeight = showLargeText ? 120 : 80
    
    // 실제 캔버스 크기 (고해상도 렌더링)
    const canvasWidth = WIDTH // MM2PX(138) = 977
    const canvasHeight = MM2PX(LABEL_SPECS.height) // MM2PX(12) = 85

    // HiDPI 캔버스 설정
    const ctx = setupCanvas(canvas, displayWidth, displayHeight)

    // 배경 그리기 (흰색)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, displayWidth, displayHeight)

    // 테두리 그리기 (진한 검은색, 두꺼운 선)
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.strokeRect(1, 1, displayWidth - 2, displayHeight - 2)

    // 폰트 설정 (더 큰 폰트, 진한 색상)
    const fontSize = showLargeText ? 18 : 14
    ctx.font = `${fontSize}px 'Roboto Mono', monospace`
    ctx.fillStyle = '#000000'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    // 2행 텍스트 그리기 (여백 조정)
    const lines = labelText.split('\n')
    const marginTop = showLargeText ? 16 : 12
    const marginLeft = showLargeText ? 32 : 24
    const lineHeight = (displayHeight - (marginTop * 2)) / 2
    
    lines.forEach((line, index) => {
      if (index < 2) {
        const y = marginTop + (index * lineHeight)
        ctx.fillText(line, marginLeft, y)
      }
    })
  }, [cells, showLargeText])

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-700">
          라벨 미리보기 ({LABEL_SPECS.width}×{LABEL_SPECS.height}mm)
        </h3>
        <button
          onClick={() => setShowLargeText(!showLargeText)}
          className="flex items-center space-x-1 px-2 py-1 text-xs border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
        >
          <span>{showLargeText ? '작게 보기' : '크게 보기'}</span>
        </button>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <canvas
          ref={canvasRef}
          className="border border-slate-300 bg-white mx-auto block"
          style={{
            maxWidth: '100%',
            height: 'auto',
            imageRendering: 'crisp-edges' // 선명한 텍스트 표시
          }}
        />
        <div className="text-center mt-2 text-xs text-slate-500">
          {showLargeText ? '확대 표시 (가독성 향상)' : '실제 출력 크기'} - {LABEL_SPECS.width}×{LABEL_SPECS.height}mm (2행 좌우정렬)
                 </div>
      </div>
    </div>
  )
}


// 메인 컴포넌트
export default function LabelPrinter() {
  const { user } = useAuth()
  
  // 상태 관리 - 단일 상태 원천
  const [type, setType] = useState<LabelType>('A')
  const [workOrderId, setWorkOrderId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [labelData, setLabelData] = useState<LabelData | null>(null)
  
  // 단일 상태 원천으로 타입 간 연동
  const [muxA, setMuxA] = useState('') // A에서 입력 → B.Left1에 사용
  const [tieB, setTieB] = useState('') // B에서 입력 → C.Left1에 사용
  const [lteMuxC, setLteMuxC] = useState('') // DB 기본값, C 우측1열
  
  // 접미 입력 상태 추가
  const [muxSuffix, setMuxSuffix] = useState('') // 예: " - 210 BAY 111"
  const [tieSuffix, setTieSuffix] = useState('') // 예: " - PORT 10"
  const [lteMuxSuffix, setLteMuxSuffix] = useState('') // 필요 시
  
  // DU 작업지시 선택 시 저장할 3개 값
  const [managementNumber, setManagementNumber] = useState('')
  const [duidFinal, setDuidFinal] = useState('')
  
  // userInputs 객체로 통합 (useMemo로 최적화)
  const userInputs: UserInputs = useMemo(() => ({ muxA, tieB, lteMuxC }), [muxA, tieB, lteMuxC])
  
  // input refs for focus management
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
  
  // DU 전용 목록 패칭
  const { data } = useQuery({
    queryKey: ['wo-du-only', { side: 'DU', limit: 500 }],
    queryFn: () =>
      apiGet(API_ENDPOINTS.WORK_ORDERS.LIST + '?side=DU&limit=500'),
    staleTime: 60_000
  });

  console.log('🔍 API 응답 데이터:', data);
  console.log('🔍 API 응답 구조:', {
    hasData: !!data,
    dataType: typeof data,
    keys: data ? Object.keys(data) : [],
    items: data?.items,
    workOrders: data?.workOrders,
    data: data?.data
  });

  // 응답 구조에 따라 데이터 추출
  const allItems = data?.items || data?.workOrders || data?.data || [];
  console.log('🔍 전체 아이템:', allItems.length, '개');

  const duItems = allItems.filter((it: any) => {
    const workType = (it.work_type ?? it.workType ?? '').toString().toUpperCase();
    const isDU = workType.includes('DU');
    const isT = workType.includes('T'); // T(Terminal) 포함
    const isDUOrT = isDU || isT;
    console.log('🔍 필터링:', { 
      id: it.id, 
      workType, 
      isDU,
      isT,
      isDUOrT,
      managementNumber: it.managementNumber 
    });
    return isDUOrT;
  });

  console.log('🔍 DU 필터링 결과:', duItems.length, '개');
  
  const selectedWorkOrder = duItems.find((wo: any) => wo.id === workOrderId) || null

  // DU 작업지시 검색 필터링
  const filteredWorkOrders = duItems.filter((wo: any) => {
    // 검색 필터
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      wo.managementNumber?.toLowerCase().includes(searchLower) ||
      wo.equipmentName?.toLowerCase().includes(searchLower) ||
      wo.operationTeam?.toLowerCase().includes(searchLower) ||
      wo.concentratorName5G?.toLowerCase().includes(searchLower) ||
      wo.duName?.toLowerCase().includes(searchLower) ||
      wo.duId?.toLowerCase().includes(searchLower) ||
      (wo.representativeRuId && wo.representativeRuId.toLowerCase().includes(searchLower))
    )
  })

  // 작업지시 선택 시 3개 값 저장
  const onSelectWO = (raw: any) => {
    const du = mapDU(raw);
    setManagementNumber(du.managementNumber);
    setDuidFinal(du.duidFinal);
    if (!lteMuxC && du.lteMuxFull) setLteMuxC(du.lteMuxFull); // 비어 있을 때만 자동 세팅
  };

  // 작업지시 선택 시 라벨 데이터 가져오기 및 자동 채움
  useEffect(() => {
    if (!selectedWorkOrder) {
      setLabelData(null)
      return
    }

    // 선택된 작업지시의 3개 값 저장
    onSelectWO(selectedWorkOrder)

    const fetchLabelData = async () => {
      try {
        const data = await apiGet(API_ENDPOINTS.WORK_ORDERS.LABEL_DATA(selectedWorkOrder.id.toString()))
        console.log('🔍 라벨 데이터 수신:', data)
        console.log('🔍 선택된 작업지시:', selectedWorkOrder)
        setLabelData(data)
        
        // 자동 채움은 "비어 있을 때만" 1회 실행
        // A용 기본 muxA: (있을 때만) 비어 있을 때 채움
        const guessMux = data?.focus5gName || selectedWorkOrder.concentratorName5G || ''
        if (!muxA && guessMux) setMuxA(guessMux)

        // C용 기본 lteMuxC: DB 칼럼 (LTE MUX / 국간,간선망)
        const dbLte = data?.lteMux || selectedWorkOrder.muxInfo || ''
        if (!lteMuxC && dbLte) setLteMuxC(dbLte)

        // 절대 setTieB로 managementNumber 등을 넣지 말 것
      } catch (error) {
        console.warn('라벨 데이터 가져오기 실패:', error)
        // API 실패 시 기존 작업지시 데이터 직접 사용
        const fallbackData: LabelData = {
          managementNumber: selectedWorkOrder.managementNumber || '',
          requestDate: selectedWorkOrder.requestDate || '',
          duTeam: selectedWorkOrder.operationTeam || '',
          ruTeam: selectedWorkOrder.operationTeam || '',
          ruId: selectedWorkOrder.representativeRuId || '',
          ruName: selectedWorkOrder.equipmentName || '',
          focus5gName: selectedWorkOrder.concentratorName5G || '',
          lineNumber: '',
          lteMux: selectedWorkOrder.muxInfo || '',
          equipmentLocation: '',
          muxType: '',
          serviceType: '',
          duId: selectedWorkOrder.duId || '',
          duName: selectedWorkOrder.duName || '',
          channelCard: selectedWorkOrder.channelCard || '',
          port: selectedWorkOrder.port || ''
        }
        console.log('🔄 폴백 데이터 사용:', fallbackData)
        setLabelData(fallbackData)
      }
    }

    fetchLabelData()
  }, [selectedWorkOrder]) // <-- type 변경이나 입력 변경에는 절대 반응시키지 말기
  
  // 현재 라벨 셀 계산 (실시간)
  const cells = useMemo(() => {
    const result = getLabelMapping(type, labelData, userInputs, muxSuffix, tieSuffix, lteMuxSuffix, duidFinal, managementNumber)
    console.log('🔄 cells 업데이트:', result)
    return result
  }, [type, labelData, userInputs, muxSuffix, tieSuffix, lteMuxSuffix, duidFinal, managementNumber])



  // 타입 변경 핸들러
  const handleTypeChange = (newType: LabelType) => {
    setType(newType)
  }

  // 단축키 처리
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        if (e.key === '1') {
          e.preventDefault()
          handleTypeChange('A')
        } else if (e.key === '2') {
          e.preventDefault()
          handleTypeChange('B')
        } else if (e.key === '3') {
          e.preventDefault()
          handleTypeChange('C')
        }
      } else if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault()
        handlePrint()
      } else if (e.ctrlKey && e.key === 'c' && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        handleCopy()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [type])

  // 라벨 출력 핸들러
  const handlePrint = () => {
    const validation = validateLabelCells(cells, type, muxA, tieB, lteMuxC)
    if (!validation.isValid) {
      toast.error(validation.message)
      if (validation.focusField && inputRefs.current[validation.focusField]) {
        inputRefs.current[validation.focusField]?.focus()
      }
      return
    }

    // 브라우저 출력
    const labelText = buildTwoLine({ L1: cells.left1, L2: cells.left2, R1: cells.right1, R2: cells.right2 })
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>라벨 출력</title>
          <style>
            body { 
              font-family: 'Roboto Mono', monospace; 
              margin: 20px; 
              font-size: 14px; 
              line-height: 1.2;
            }
            .label { 
              border: 1px solid #000; 
              width: 138mm; 
              height: 12mm; 
              padding: 2mm;
              white-space: pre-wrap;
              display: flex;
              align-items: center;
              margin-bottom: 5mm;
            }
            @media print {
              body { margin: 0; }
              .label { margin: 0 0 5mm 0; }
            }
          </style>
        </head>
        <body>
          <div class="label">${labelText}</div>
        </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  // 복사 핸들러
  const handleCopy = () => {
    const validation = validateLabelCells(cells, type, muxA, tieB, lteMuxC)
    if (!validation.isValid) {
      toast.error(validation.message)
      if (validation.focusField && inputRefs.current[validation.focusField]) {
        inputRefs.current[validation.focusField]?.focus()
      }
      return
    }
    
    // 클립보드에 복사
    const labelText = buildTwoLine({ L1: cells.left1, L2: cells.left2, R1: cells.right1, R2: cells.right2 })
    navigator.clipboard.writeText(labelText).then(() => {
      toast.success('라벨 텍스트가 클립보드에 복사되었습니다')
    }).catch(() => {
      toast.error('클립보드 복사에 실패했습니다')
    })
  }

  // 로딩 상태
  if (data === undefined) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-6 md:py-8 bg-slate-50">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E40AF]"></div>
          <span className="ml-3 text-slate-600">DU/T 작업지시를 불러오는 중...</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        .thin-scroll::-webkit-scrollbar{height:8px;width:8px}
        .thin-scroll::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:8px}
        .thin-scroll::-webkit-scrollbar-track{background:transparent}
      `}</style>
    <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6 bg-slate-50">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">라벨 프린터 (PT-P300BT)</h1>
        <p className="mt-1 text-xs md:text-sm text-slate-600">
          DU측 라벨 전용 (138×12mm, 2행×2열) - 타입 간 값 연동 지원
        </p>
      </div>

      {/* 단축키 안내 */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 md:p-6 hover:shadow-md transition-shadow">
        <div className="text-sm text-slate-700">
          <strong>단축키:</strong> Alt+1(A), Alt+2(B), Alt+3(C), Ctrl+Enter(인쇄), Ctrl+C(복사)
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
                 {/* 왼쪽: 설정 */}
         <div className="space-y-5 md:space-y-6">
           {/* 라벨 타입 선택 */}
           <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 md:p-6 hover:shadow-md transition-shadow">
             <LabelTypeSelector
               selectedType={type}
               onTypeChange={handleTypeChange}
             />
           </div>

           {/* 2x2 셀 입력 */}
           <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 md:p-6 hover:shadow-md transition-shadow">
             <h2 className="text-lg font-semibold text-slate-900 mb-4">라벨 정보 입력</h2>
                           <CellInputs
                cells={cells}
                inputRefs={inputRefs}
                type={type}
                muxA={muxA}
                setMuxA={setMuxA}
                muxSuffix={muxSuffix}
                setMuxSuffix={setMuxSuffix}
                tieB={tieB}
                setTieB={setTieB}
                tieSuffix={tieSuffix}
                setTieSuffix={setTieSuffix}
                lteMuxC={lteMuxC}
                setLteMuxC={setLteMuxC}
                lteMuxSuffix={lteMuxSuffix}
                setLteMuxSuffix={setLteMuxSuffix}
              />
           </div>

           {/* 작업지시 선택 */}
           <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 md:p-6 hover:shadow-md transition-shadow">
             <div className="flex items-center justify-between mb-4">
               <h2 className="text-lg font-semibold text-slate-900">작업지시 선택 (선택사항)</h2>
               <span className="inline-flex items-center h-6 px-2 rounded-md text-xs bg-slate-100 text-slate-700">DU측 전용</span>
             </div>
            
                         <div className="relative mb-4">
               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
               <input
                 type="text"
                 placeholder="관리번호, 장비명, 운용팀으로 검색..."
                 className="w-full pl-10 pr-4 h-11 rounded-lg border-slate-300 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#E60012]/30 focus-visible:border-[#E60012]"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
             </div>

             <div className="max-h-64 overflow-y-auto space-y-2 thin-scroll">
               {filteredWorkOrders.length > 0 ? (
                                  filteredWorkOrders.slice(0, 10).map((workOrder: any) => {
                    const isSelected = workOrderId === workOrder.id
                    
                    return (
                      <div
                        key={workOrder.id}
                        className={`px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                          isSelected 
                            ? 'border-l-4 border-[#1E40AF] bg-slate-50' 
                            : 'hover:bg-slate-50'
                        }`}
                        onClick={() => setWorkOrderId(workOrder.id)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">
                            {workOrder.operationTeam}
                          </span>
                          <span className="text-xs opacity-80">
                            {workOrder.managementNumber}
                          </span>
                        </div>
                        <div className="text-sm opacity-90">
                          {workOrder.equipmentName}
                        </div>
                      </div>
                    )
                  })
               ) : (
                 <div className="text-center py-8">
                   <BarChart3 className="mx-auto h-12 w-12 text-slate-400" />
                   <p className="mt-2 text-sm text-slate-600">
                     {searchTerm ? 'DU측 작업지시 검색 결과가 없습니다' : 'DU측 작업지시가 없습니다'}
                   </p>
                   <p className="mt-1 text-xs text-slate-400">
                     라벨 프린터는 DU측 작업지시만 표시됩니다
                   </p>
                 </div>
               )}
             </div>
           </div>
         </div>

                 {/* 오른쪽: 미리보기 및 출력 */}
         <div className="space-y-5 md:space-y-6">
           {/* 미리보기 */}
           <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 md:p-6 hover:shadow-md transition-shadow">
             <LabelPreview cells={cells} />
           </div>

           {/* 붙여넣기 텍스트 */}
           <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 md:p-6 hover:shadow-md transition-shadow">
             <div className="space-y-3">
               <div className="flex items-center justify-between">
                 <h3 className="text-sm font-medium text-slate-700">
                   Brother P-touch 붙여넣기 원문
                 </h3>
                 <button
                   onClick={async () => {
                     try {
                       await navigator.clipboard.writeText(buildTwoLine({ L1: cells.left1, L2: cells.left2, R1: cells.right1, R2: cells.right2 }))
                       toast.success('라벨 텍스트가 클립보드에 복사되었습니다')
                     } catch (error) {
                       console.error('클립보드 복사 실패:', error)
                       toast.error('클립보드 복사에 실패했습니다')
                     }
                   }}
                   className="absolute top-3 right-3 h-10 rounded-lg bg-[#1E40AF] hover:bg-[#1E3A8A] text-white px-3"
                 >
                   <Copy className="w-4 h-4" />
                   <span>복사</span>
                 </button>
               </div>
               <div className="bg-white border border-slate-300 p-3 md:p-4 rounded-xl">
                 <pre className="font-mono text-sm md:text-base leading-6 rounded-xl border-slate-300 p-3 md:p-4 focus-visible:ring-2 focus-visible:ring-[#E60012]/30 focus-visible:border-[#E60012]">
                   {buildTwoLine({ L1: cells.left1, L2: cells.left2, R1: cells.right1, R2: cells.right2 })}
                 </pre>
               </div>
               <div className="text-xs text-slate-500">
                 Brother P-touch Design&Print 2 앱에서 텍스트 박스에 붙여넣기하면 좌우 정렬이 자동 적용됩니다.
               </div>
             </div>
           </div>

           {/* 출력 버튼 */}
           <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 md:p-6 hover:shadow-md transition-shadow">
             <h3 className="text-lg font-semibold text-slate-900 mb-4">출력 및 사용법</h3>
             <div className="space-y-3">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 <button
                   onClick={handleCopy}
                   className="h-11 rounded-lg bg-[#1E40AF] hover:bg-[#1E3A8A] text-white flex items-center justify-center space-x-2 font-medium"
                 >
                   <Copy className="w-4 h-4" />
                   <span>복사 (Brother 앱용)</span>
                 </button>
                 
                 <button
                   onClick={handlePrint}
                   className="h-11 rounded-lg bg-[#E60012] hover:bg-[#C50010] text-white flex items-center justify-center space-x-2 font-medium"
                 >
                   <Printer className="w-4 h-4" />
                   <span>브라우저 인쇄</span>
                 </button>
               </div>
               
               <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md">
                 <div className="font-semibold mb-2">사용법:</div>
                 <ol className="list-decimal list-inside space-y-1 marker:text-slate-400">
                   <li>Brother P-touch Design&Print 2 앱 실행</li>
                   <li>새 라벨 만들기 → 12mm TZe 테이프 선택</li>
                   <li>텍스트 박스 추가 후 위 '복사' 버튼으로 붙여넣기</li>
                   <li>PT-P300BT로 인쇄 실행</li>
                 </ol>
               </div>
             </div>
           </div>
         </div>
      </div>
    </div>
    </>
  )
}