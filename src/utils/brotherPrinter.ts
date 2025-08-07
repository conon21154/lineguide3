// Brother PT-P300BT 프린터 연결 및 출력 유틸리티

export interface BrotherPrinterConfig {
  tapeWidth: number // mm (3.5, 6, 9, 12)
  printSpeed: 'slow' | 'medium' | 'fast'
  density: 'light' | 'medium' | 'dark'
  autoCut: boolean
}

export interface LabelContent {
  firstLine: string
  bayFdf: string
  secondLine: string
  mux5G?: string
}

// PT-P300BT 기본 설정
export const DEFAULT_CONFIG: BrotherPrinterConfig = {
  tapeWidth: 12, // 12mm TZe 테이프
  printSpeed: 'medium',
  density: 'medium',
  autoCut: true
}

// Brother P-touch Editor 명령어 생성
export function createBrotherPrintCommand(content: LabelContent, config: BrotherPrinterConfig = DEFAULT_CONFIG): Uint8Array {
  // Brother PT-P300BT는 P-touch Template Command를 사용
  // 실제 명령어는 Brother SDK 또는 공식 라이브러리가 필요합니다
  
  const commands: number[] = []
  
  // ESC/P 초기화 명령어
  commands.push(0x1B, 0x40) // ESC @ (Initialize)
  
  // 테이프 폭 설정
  commands.push(0x1B, 0x69, 0x7A, config.tapeWidth) // Set tape width
  
  // 인쇄 밀도 설정
  const densityValue = config.density === 'light' ? 0x01 : config.density === 'dark' ? 0x03 : 0x02
  commands.push(0x1B, 0x69, 0x4B, densityValue)
  
  // 자동 컷 설정
  if (config.autoCut) {
    commands.push(0x1B, 0x69, 0x4D, 0x40)
  }
  
  // 텍스트 데이터 추가 (간소화된 형태)
  const textData = `${content.firstLine}\n${content.bayFdf}\n${content.secondLine}\n`
  const textBytes = new TextEncoder().encode(textData)
  commands.push(...Array.from(textBytes))
  
  // 인쇄 명령
  commands.push(0x0C) // Form Feed (Print)
  
  return new Uint8Array(commands)
}

// Brother P-touch Design&Print 2 앱 호출 (개선된 버전)
export function openBrotherApp(content: LabelContent): void {
  const text = content.mux5G ? 
    `${content.firstLine}\n${content.bayFdf}\n${content.secondLine} | ${content.mux5G}` :
    `${content.firstLine}\n${content.bayFdf}\n${content.secondLine}`
  const encodedText = encodeURIComponent(text)
  
  // 모바일 환경 감지
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)

  if (isMobile) {
    // 사용자에게 안내 메시지 표시
    const message = `📱 Brother P-touch Design&Print 2 앱을 사용합니다.\n\n` +
                   `🏷️ 라벨 내용:\n${content.firstLine}\n${content.bayFdf}\n${content.secondLine}\n\n` +
                   `다음 단계:\n` +
                   `1. Brother 앱이 실행됩니다\n` +
                   `2. 라벨 텍스트를 복사해서 사용하세요\n` +
                   `3. PT-P300BT와 블루투스 연결 후 출력\n\n` +
                   `계속하시겠습니까?`
    
    if (!confirm(message)) {
      return
    }

    // 클립보드에 라벨 텍스트 복사 (가능한 경우)
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        console.log('📋 라벨 텍스트가 클립보드에 복사되었습니다')
      }).catch((err) => {
        console.warn('클립보드 복사 실패:', err)
      })
    }

    // 여러 URL 스키마 시도
    const urlSchemes = [
      `ptouch://create?text=${encodedText}`,
      `com.brother.ptouch.designandprint2://create?text=${encodedText}`,
      `brotherptouch://create?text=${encodedText}`
    ]

    let appOpened = false
    
    // 첫 번째 URL 스키마 시도
    try {
      window.location.href = urlSchemes[0]
      appOpened = true
    } catch (error) {
      console.log('첫 번째 URL 스키마 실패:', error)
    }

    // 앱 설치 확인 및 스토어 리다이렉트
    setTimeout(() => {
      if (!appOpened || document.hidden === false) {
        const storeUrl = isIOS 
          ? 'https://apps.apple.com/app/brother-p-touch-design-print-2/id1468451451'
          : 'https://play.google.com/store/apps/details?id=com.brother.ptouch.designandprint2'
        
        const storeMessage = `📱 Brother P-touch Design&Print 2 앱이 설치되지 않은 것 같습니다.\n\n` +
                           `✅ 앱을 설치하시겠습니까?\n\n` +
                           `설치 후 다시 라벨 출력을 시도해주세요.`
        
        if (confirm(storeMessage)) {
          window.open(storeUrl, '_blank')
        } else {
          // 수동으로 텍스트 안내
          alert(`📋 라벨 텍스트를 수동으로 복사하세요:\n\n${text}\n\nBrother 앱에서 이 텍스트를 붙여넣기하여 사용하세요.`)
        }
      }
    }, 2500)

  } else {
    // PC/데스크톱 환경
    const desktopMessage = `🖥️ 데스크톱 환경에서는 다음 방법을 권장합니다:\n\n` +
                          `1. 📱 모바일에서 이 페이지에 접속\n` +
                          `2. Brother P-touch Design&Print 2 앱 사용\n` +
                          `3. 또는 아래 텍스트를 복사해서 앱에서 사용:\n\n` +
                          `${text}\n\n` +
                          `텍스트를 클립보드에 복사하시겠습니까?`
    
    if (confirm(desktopMessage)) {
      // 클립보드에 복사
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
          alert('📋 텍스트가 클립보드에 복사되었습니다!')
        }).catch((err) => {
          console.error('클립보드 복사 실패:', err)
          // 폴백: 텍스트 선택 창 표시
          prompt('아래 텍스트를 복사하세요:', text)
        })
      } else {
        // 폴백: 텍스트 선택 창 표시
        prompt('아래 텍스트를 복사하세요:', text)
      }
    }
  }
}

// 웹 브라우저용 인쇄 (표준 브라우저 프린트 다이얼로그)
export function createPrintableHTML(content: LabelContent, quantity: number = 1): string {
  return `
    <html>
      <head>
        <title>Brother PT-P300BT 라벨 출력</title>
        <style>
          @page { 
            size: 138mm 12mm;
            margin: 0;
          }
          @media print {
            body { 
              margin: 0; 
              padding: 0;
              font-family: Arial, sans-serif;
            }
            .no-print { display: none !important; }
          }
          body { 
            margin: 10px; 
            font-family: Arial, sans-serif;
          }
          .label {
            width: 138mm;
            height: 12mm;
            border: 1px solid #ccc;
            position: relative;
            page-break-after: always;
            margin-bottom: 5mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 1mm;
            box-sizing: border-box;
          }
          .first-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 10px;
            font-weight: bold;
            height: 5mm;
          }
          .first-line {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .bay-fdf {
            font-size: 9px;
            font-weight: normal;
            margin-left: 2mm;
            text-align: center;
            min-width: 30mm;
          }
          .second-line {
            font-size: 8px;
            font-weight: normal;
            height: 4mm;
            display: flex;
            align-items: center;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            width: 95mm;
          }
          .mux5g {
            font-size: 8px;
            font-weight: normal;
            height: 4mm;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            position: absolute;
            right: 2mm;
            top: 7mm;
            width: 35mm;
            background-color: #fffbeb;
            color: #92400e;
            border: 1px solid #f59e0b;
          }
          .instructions {
            margin: 20px 0;
            padding: 10px;
            background: #f0f8ff;
            border: 1px solid #0066cc;
            border-radius: 5px;
          }
          .print-button {
            background: #0066cc;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin: 10px 0;
          }
          .print-button:hover {
            background: #0052a3;
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <h2>Brother PT-P300BT 라벨 출력</h2>
          <div class="instructions">
            <h3>📱 모바일 사용자 (권장)</h3>
            <p>• Brother P-touch Design&Print 2 앱을 사용하시면 더 정확한 출력이 가능합니다</p>
            <p>• 아래 텍스트를 복사해서 앱에서 사용하세요:</p>
            <p><strong>${content.firstLine}<br>${content.bayFdf}<br>${content.secondLine}</strong></p>
            
            <h3>🖥️ 브라우저 출력</h3>
            <p>• 아래 버튼을 클릭하여 브라우저의 인쇄 기능을 사용하세요</p>
            <p>• 인쇄 설정: 용지 크기 "사용자 정의" → 138mm x 12mm</p>
            <p>• 여백: 없음 또는 최소</p>
          </div>
          <button class="print-button" onclick="window.print()">🖨️ 인쇄하기</button>
        </div>
        
        ${Array.from({ length: quantity }, () => `
          <div class="label">
            <div class="first-row">
              <div class="first-line">${content.firstLine}</div>
              <div class="bay-fdf">${content.bayFdf}</div>
            </div>
            <div class="second-line">${content.secondLine}</div>
            ${content.mux5G ? `<div class="mux5g">${content.mux5G}</div>` : ''}
          </div>
        `).join('')}
      </body>
    </html>
  `
}

// TZe 테이프 정보
export const TZE_TAPES = [
  { width: 3.5, name: 'TZe-101 (3.5mm)', description: '투명바탕/검정글씨' },
  { width: 6, name: 'TZe-111 (6mm)', description: '투명바탕/검정글씨' },
  { width: 9, name: 'TZe-121 (9mm)', description: '투명바탕/검정글씨' },
  { width: 12, name: 'TZe-131 (12mm)', description: '투명바탕/검정글씨' },
  { width: 12, name: 'TZe-231 (12mm)', description: '흰바탕/검정글씨' },
  { width: 12, name: 'TZe-431 (12mm)', description: '빨강바탕/검정글씨' }
]

// 프린터 상태 확인 (미래 구현용)
export async function checkPrinterStatus(): Promise<{
  connected: boolean
  tapeWidth?: number
  batteryLevel?: number
  error?: string
}> {
  // 실제 구현은 Brother SDK 필요
  return {
    connected: false,
    error: 'Brother SDK가 필요합니다'
  }
}