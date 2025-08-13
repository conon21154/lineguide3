const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const iconv = require('iconv-lite');
const { Op, Sequelize } = require('sequelize');
const { WorkOrder, FieldResponse } = require('../models');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// 파일 업로드 설정
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    console.log('파일 검증 중:', file.originalname, file.mimetype);
    if (file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv') {
      console.log('✅ 파일 검증 통과');
      cb(null, true);
    } else {
      console.log('❌ 파일 검증 실패: CSV 파일이 아님');
      cb(new Error('CSV 파일만 업로드 가능합니다'));
    }
  }
});

// 헬퍼 함수들
const trimValue = (val) => {
  if (val == null) return undefined; // null/undefined만 제외
  const s = String(val).trim();
  if (s === '' || s.toLowerCase() === 'undefined' || s === '-') return undefined;
  return s; // '0'은 유효값으로 유지
};

// 팀명 정규화 (공백/제로폭 제거)
const normalizeTeam = (t) => {
  const s = trimValue(t);
  return s ? s.replace(/\s+/g, '').replace(/\u200b/g, '').trim() : undefined;
};


const { normalizeCircuit } = require('../utils/telecom');

const deSci = (val) => {
  if (!val) return undefined;
  return normalizeCircuit(val);
};

const getBaseMgmtNo = (mgmt) => {
  if (!mgmt) return mgmt;
  return mgmt.replace(/_(DU측|RU측)$/, '');
};

const firstNonEmpty = (...values) => {
  for (const val of values) {
    const trimmed = trimValue(val);
    if (trimmed) return trimmed;
  }
  return undefined;
};

const isRU_A = (ruName) => {
  if (!ruName) return false;
  return /(^|[_\s-])(A|32T_A|_A)\b/i.test(ruName);
};

const makeEquipmentNameRU = (raw) => {
  return firstNonEmpty(raw['RU_명'], raw['RU_ID'], raw['관리번호']);
};

const makeEquipmentNameDU = (raw) => {
  return firstNonEmpty(raw['5G 집중국명'], raw['DU명'], raw['관리번호']);
};

// 작업지시 목록 조회
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.team) where.operationTeam = req.query.team;
    if (req.query.status) where.status = req.query.status;
    if (req.query.search) {
      where[Op.or] = [
        { managementNumber: { [Op.like]: `%${req.query.search}%` } },
        { equipmentName: { [Op.like]: `%${req.query.search}%` } }
      ];
    }

    const { count, rows } = await WorkOrder.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', req.query.sortOrder || 'DESC']],
      attributes: {
        include: [
          [
            Sequelize.literal(`
              EXISTS (
                SELECT 1
                FROM response_notes rn
                WHERE rn.work_order_id = WorkOrder.id
                  AND rn.side = CASE WHEN WorkOrder.work_type = 'DU측' THEN 'DU' ELSE 'RU' END
                  AND rn.deleted_at IS NULL
              )
            `),
            'hasMemo'
          ]
        ]
      }
    });

    res.json({
      workOrders: rows,
      pagination: {
        page,
        limit,
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        hasNextPage: page < Math.ceil(count / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('작업지시 조회 오류:', error);
    res.status(500).json({
      error: '작업지시 조회 중 오류가 발생했습니다'
    });
  }
});

// 작업지시 생성
router.post('/', authMiddleware, async (req, res) => {
  try {
    const workOrderData = {
      ...req.body,
      createdBy: req.user.userId,
      status: req.body.status || 'pending'
    };

    const workOrder = await WorkOrder.create(workOrderData);

    res.status(201).json({
      message: '작업지시가 생성되었습니다',
      workOrder
    });

  } catch (error) {
    console.error('작업지시 생성 오류:', error);
    res.status(500).json({
      error: '작업지시 생성 중 오류가 발생했습니다'
    });
  }
});

// CSV 업로드 및 일괄 생성
router.post('/bulk-upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    console.log('📄 CSV 업로드 요청 받음');
    console.log('🔐 사용자 정보:', req.user);
    console.log('📎 파일 정보:', {
      originalname: req.file?.originalname,
      mimetype: req.file?.mimetype,
      size: req.file?.size
    });

    if (!req.file) {
      return res.status(400).json({ error: 'CSV 파일이 업로드되지 않았습니다' });
    }

    console.log('✅ 파일 업로드 확인:', req.file);
    console.log(`📄 CSV 파일 수신: ${req.file.originalname} 크기: ${req.file.size}`);

    // EUC-KR로 인코딩된 파일 읽기
    let fileContent;
    try {
      const rawData = fs.readFileSync(req.file.path);
      fileContent = iconv.decode(rawData, 'euc-kr');
      console.log('✅ euc-kr 인코딩으로 성공적으로 디코딩됨');
    } catch (decodeError) {
      console.log('❌ euc-kr 디코딩 실패, UTF-8로 시도:', decodeError.message);
      fileContent = fs.readFileSync(req.file.path, 'utf8');
    }

    console.log('CSV 파일 첫 500자:', fileContent.substring(0, 500));

    // CSV 파싱
    const csvLines = fileContent.split('\n').filter(line => line.trim());
    console.log(`총 ${csvLines.length} 행 발견`);
    console.log('첫 3개 행:', csvLines.slice(0, 3));

    if (csvLines.length < 2) {
      return res.status(400).json({ error: 'CSV 파일에 데이터가 없습니다' });
    }

    const header = csvLines[0];
    console.log('헤더:', header);

    // 신규버전 포맷 확인
    const isNewFormat = header.includes('관리번호') && header.includes('RU_ID');
    console.log('CSV 포맷 확인:', isNewFormat ? '신규버전 포맷' : '기존 포맷');

    if (!isNewFormat) {
      return res.status(400).json({ error: '지원하지 않는 CSV 포맷입니다. 신규버전 포맷을 사용해주세요.' });
    }

    // CSV 파싱
    const records = [];
    const stream = require('stream');
    const readable = new stream.Readable();
    readable.push(fileContent);
    readable.push(null);
    
    readable
      .pipe(csv())
      .on('data', (data) => records.push(data))
      .on('end', () => {
        console.log(`📊 파싱된 데이터: ${records.length}개 행`);
        processCSVData(records, req, res);
      })
      .on('error', (err) => {
        console.error('CSV 파싱 오류:', err);
        res.status(400).json({ error: 'CSV 파일 파싱 중 오류가 발생했습니다' });
      });

  } catch (error) {
    console.error('CSV 업로드 처리 오류:', error);
    res.status(500).json({
      error: 'CSV 파일 처리 중 오류가 발생했습니다',
      details: error.message
    });
  } finally {
    // 임시 파일 정리
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('✅ 임시 파일 삭제됨');
      } catch (unlinkError) {
        console.warn('⚠️ 임시 파일 삭제 실패:', unlinkError.message);
      }
    }
  }
});

// CSV 데이터 처리 함수
async function processCSVData(data, req, res) {
  try {
    console.log('🔄 CSV 데이터 처리 시작');

    // 1단계: 베이스 관리번호로 그룹화
    const groups = {};
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const raw = data[i];
      console.log(`행 ${i + 1} 처리 중:`, [raw['관리번호'], raw['요청일'], raw['DU운용팀'], raw['DU담당자'], raw['RU운용팀']]);

      try {
        const mgmtNo = trimValue(raw['관리번호']);
        if (!mgmtNo) {
          console.warn(`행 ${i + 1}: 관리번호 없음, 건너뜀`);
          continue;
        }

        const baseMgmt = getBaseMgmtNo(mgmtNo);
        
        if (!groups[baseMgmt]) {
          groups[baseMgmt] = { rows: [], duTeam: undefined, ruTeam: undefined, _duTeamSeen: new Set(), _ruTeamSeen: new Set() };
        }
        
        groups[baseMgmt].rows.push(raw);
        // 팀 누적 (최초 유효값 유지 / 불일치 감지)
        const duT = normalizeTeam(raw['DU운용팀']);
        const ruT = normalizeTeam(raw['RU운용팀']);
        if (duT) {
          groups[baseMgmt]._duTeamSeen.add(duT);
          if (!groups[baseMgmt].duTeam) groups[baseMgmt].duTeam = duT;
          if (groups[baseMgmt]._duTeamSeen.size > 1) console.warn('⚠️ DU팀 불일치 감지:', baseMgmt, Array.from(groups[baseMgmt]._duTeamSeen));
        }
        if (ruT) {
          groups[baseMgmt]._ruTeamSeen.add(ruT);
          if (!groups[baseMgmt].ruTeam) groups[baseMgmt].ruTeam = ruT;
          if (groups[baseMgmt]._ruTeamSeen.size > 1) console.warn('⚠️ RU팀 불일치 감지:', baseMgmt, Array.from(groups[baseMgmt]._ruTeamSeen));
        }
        
        const ruInfo = `${raw['RU_명']} (${raw['서비스구분']}) - 채널카드:${raw['채널카드']} 포트:${raw['포트']}`;
        console.log(`📡 RU 정보 수집: ${ruInfo}`);

      } catch (error) {
        errors.push(`행 ${i + 1} 처리 오류: ${error.message}`);
        console.error(`행 ${i + 1} 오류:`, error);
      }
    }

    console.log(`📋 수집된 관리번호: ${Object.keys(groups).length}개`);

    // 2단계: 각 그룹을 RU작업 + DU작업 DTO로 변환 (항상 2건 생성)
    const dtoList = [];

    for (const [baseMgmt, group] of Object.entries(groups)) {
      try {
        console.log(`🔧 ${baseMgmt} 통합 작업지시 생성: RU ${group.rows.length}개`);

        const first = group.rows[0];
        const firstRow = group.rows?.[0] || group.firstRow || {};
        const ruInfoList = group.rows.map(r => ({
          ruId: trimValue(r['RU_ID']),
          ruName: trimValue(r['RU_명']),
          channelCard: trimValue(r['채널카드']),
          port: trimValue(r['포트']),
          serviceType: trimValue(r['서비스구분'])
        })).filter(ru => ru.ruId);

        // 대표 RU 선택 (항상 A)
        const representative = ruInfoList.find(ru => isRU_A(ru.ruName)) || ruInfoList[0];
        console.log(`👑 대표 RU 선택: ${representative?.ruName} (${representative?.ruId})`);

        // 서비스 위치 구성
        const serviceLocation = [
          trimValue(first['시/도']),
          trimValue(first['시/군/구']),
          trimValue(first['읍/면/동(리)']),
          trimValue(first['번지']),
          trimValue(first['건물명']),
          trimValue(first['장비위치'])
        ].filter(Boolean).join(' ');

        // MUX 정보
        const muxInfo = {
          lteMux: trimValue(first['(LTE MUX / 국간,간선망)']),
          muxType: trimValue(first['MUX종류']),
          '서비스구분': trimValue(first['서비스구분'])
        };

        // 항상 2건(DU/RU) 생성
        const withSuffix = (base, suffix) => `${base}_${suffix}`;
        const baseMgmtNo = baseMgmt;
        const duTeam = groups[baseMgmt].duTeam || trimValue(firstRow['DU운용팀']) || '기타';
        const ruTeam = groups[baseMgmt].ruTeam || trimValue(firstRow['RU운용팀']) || '기타';

        // DU측 DTO
        const duDto = {
          id: withSuffix(baseMgmtNo, 'DU측'),
          managementNumber: withSuffix(baseMgmtNo, 'DU측'),
          requestDate: trimValue(first['요청일']),
          operationTeam: duTeam,

          equipmentType: '5G 장비',
          equipmentName: makeEquipmentNameDU(first),
          category: trimValue(first['구분']),
          serviceType: representative?.serviceType,

          concentratorName5G: trimValue(first['5G 집중국명']) || 'N/A',
          coSiteCount5G: trimValue(first['co-SITE 수량']) || String(ruInfoList.length),

          ruInfoList: ruInfoList,
          representativeRuId: representative?.ruId,

          muxInfo: muxInfo,
          lineNumber: deSci(first['회선번호']),

          duId: trimValue(first['DUID']),
          duName: trimValue(first['DU명']),
          channelCard: representative?.channelCard,
          port: representative?.port,

          workType: 'DU측',
          status: 'pending',

          createdBy: req.user.userId,
          customer_name: withSuffix(baseMgmtNo, 'DU측'),
          team: duTeam
        };
        console.log('🏢 DU측 작업지시 생성:', `${baseMgmtNo} → ${duDto.operationTeam}`);
        dtoList.push(duDto);

        // RU측 DTO
        const ruDto = {
          id: withSuffix(baseMgmtNo, 'RU측'),
          managementNumber: withSuffix(baseMgmtNo, 'RU측'),
          requestDate: trimValue(first['요청일']),
          operationTeam: ruTeam,

          equipmentType: '5G 장비',
          equipmentName: makeEquipmentNameRU(first),
          category: trimValue(first['구분']),
          serviceLocation: serviceLocation || undefined,
          serviceType: representative?.serviceType,

          concentratorName5G: trimValue(first['5G 집중국명']) || 'N/A',
          coSiteCount5G: trimValue(first['co-SITE 수량']) || String(ruInfoList.length),

          ruInfoList: ruInfoList,
          representativeRuId: representative?.ruId,

          muxInfo: muxInfo,
          lineNumber: deSci(first['회선번호']),

          duId: trimValue(first['DUID']),
          duName: trimValue(first['DU명']),
          channelCard: representative?.channelCard,
          port: representative?.port,

          workType: 'RU측',
          status: 'pending',

          createdBy: req.user.userId,
          customer_name: withSuffix(baseMgmtNo, 'RU측'),
          team: ruTeam
        };
        const ruSummary = ruInfoList.map(ru => ru.ruName?.split('_').pop() || 'Unknown').join(', ');
        console.log(`📡 RU측 작업지시 생성: ${baseMgmtNo} → ${ruDto.operationTeam} (${ruSummary})`);
        dtoList.push(ruDto);

        // 팀 분리 여부/표본 출력
        console.log('🪪 Team split', {
          baseNo: baseMgmtNo,
          duTeam,
          ruTeam,
          ruCount: (groups[baseMgmt].rows || []).length,
          sample: {
            du: { id: duDto.id, team: duDto.operationTeam },
            ru: { id: ruDto.id, team: ruDto.operationTeam }
          }
        });

        // 그룹 단위 집계 로그 (방금 생성된 2건 기준)
        const out = [duDto, ruDto];
        const groupTeamSummary = {};
        out.forEach(o => {
          const k = o.operationTeam || '기타';
          groupTeamSummary[k] = (groupTeamSummary[k] || 0) + 1;
        });
        const groupDuCount = out.filter(o => o.workType === 'DU측').length;
        const groupRuCount = out.filter(o => o.workType === 'RU측').length;
        console.log('🧩 DTO 그룹 집계:', {
          base: baseMgmtNo,
          total: out.length,
          duCount: groupDuCount,
          ruCount: groupRuCount,
          teamSummary: groupTeamSummary,
          samples: out.map(x => ({ id: x.id, mgmt: x.managementNumber, wt: x.workType, team: x.operationTeam }))
        });

      } catch (groupError) {
        errors.push(`그룹 ${baseMgmt} 처리 오류: ${groupError.message}`);
        console.error(`그룹 ${baseMgmt} 오류:`, groupError);
      }
    }

        console.log('[DTO sample count]', dtoList.length);
        if (dtoList.length > 0) {
          console.log('[DTO sample 1]', JSON.stringify(dtoList[0], null, 2));
        }
        if (dtoList.length > 1) {
          console.log('[DTO sample 2]', JSON.stringify(dtoList[1], null, 2));
        }

        // 집계 로그: 총계/DU/RU 건수 및 팀 요약 및 샘플
        const duCount = dtoList.filter(o => o.workType === 'DU측').length;
        const ruCount = dtoList.filter(o => o.workType === 'RU측').length;
        const teamSummary = {};
        dtoList.forEach(o => {
          const k = o.operationTeam || '기타';
          teamSummary[k] = (teamSummary[k] || 0) + 1;
        });
        console.log('🧩 DTO 집계:', {
          total: dtoList.length,
          duCount,
          ruCount,
          teamSummary,
          samples: dtoList.slice(0, 4).map(x => ({ id: x.id, mgmt: x.managementNumber, wt: x.workType, team: x.operationTeam }))
        });

    // 데이터베이스에 저장
    const { sequelize } = require('../models');
    const transaction = await sequelize.transaction();
    
    try {
      console.log(`🔄 ${dtoList.length}개 작업지시 데이터베이스 저장 시작`);
      
      const createdWorkOrders = [];
      
      for (const dto of dtoList) {
        try {
          const workOrder = await WorkOrder.create({
            managementNumber: dto.managementNumber,
            requestDate: dto.requestDate,
            workType: dto.workType,
            operationTeam: dto.operationTeam,
            ruOperationTeam: dto.operationTeam,
            category: dto.category,
            equipmentType: dto.equipmentType,
            equipmentName: dto.equipmentName,
            serviceType: dto.serviceType,
            coSiteCount5G: dto.coSiteCount5G,
            concentratorName5G: dto.concentratorName5G,
            duId: dto.duId,
            duName: dto.duName,
            channelCard: dto.channelCard,
            port: dto.port,
            lineNumber: dto.lineNumber,
            representativeRuId: dto.representativeRuId,
            serviceLocation: dto.serviceLocation,
            status: dto.status,
            priority: 'normal',
            createdBy: dto.createdBy,
            labelPrinted: false,
            customer_name: dto.customer_name,
            team: dto.team,
            ruInfoList: JSON.stringify(dto.ruInfoList),
            muxInfo: JSON.stringify(dto.muxInfo)
          }, { transaction });

          createdWorkOrders.push(workOrder);
        } catch (createError) {
          errors.push(`작업지시 ${dto.managementNumber} 생성 실패: ${createError.message}`);
          console.error('작업지시 생성 실패:', createError);
        }
      }

      await transaction.commit();
      console.log(`✅ ${createdWorkOrders.length}개 작업지시 저장 완료`);

      res.status(201).json({
        success: true,
        message: `${createdWorkOrders.length}개의 작업지시가 생성되었습니다`,
        summary: {
          total_processed: dtoList.length,
          created: createdWorkOrders.length,
          errors: errors.length
        },
        data: {
          workOrders: createdWorkOrders.slice(0, 5),
          processingErrors: errors.length > 0 ? errors : undefined
        },
        timestamp: new Date().toISOString()
      });

    } catch (dbError) {
      await transaction.rollback();
      console.error('데이터베이스 저장 실패:', dbError);
      res.status(500).json({
        error: '데이터베이스 저장 중 오류가 발생했습니다',
        details: dbError.message
      });
    }

  } catch (error) {
    console.error('CSV 데이터 처리 오류:', error);
    res.status(500).json({
      error: 'CSV 데이터 처리 중 오류가 발생했습니다',
      details: error.message
    });
  }
}

// 작업지시 상태 변경
router.put('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const workOrder = await WorkOrder.findByPk(req.params.id);

    if (!workOrder) {
      return res.status(404).json({ error: '작업지시를 찾을 수 없습니다' });
    }

    await workOrder.update({
      status,
      notes,
      updatedBy: req.user.userId,
      completedAt: status === 'completed' ? new Date() : null
    });

    // 기존 field_responses 생성 로직은 비활성화 (새로운 response_notes 시스템 사용)
    // TODO: 기존 로직 제거됨 - 새로운 response_notes API 사용

    res.json({
      message: '상태가 변경되었습니다',
      workOrder
    });

  } catch (error) {
    console.error('상태 변경 오류:', error);
    res.status(500).json({
      error: '상태 변경 중 오류가 발생했습니다'
    });
  }
});

// 작업지시 삭제
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const workOrder = await WorkOrder.findByPk(req.params.id);

    if (!workOrder) {
      return res.status(404).json({ error: '작업지시를 찾을 수 없습니다' });
    }

    await workOrder.destroy();

    res.json({ message: '작업지시가 삭제되었습니다' });

  } catch (error) {
    console.error('작업지시 삭제 오류:', error);
    res.status(500).json({
      error: '작업지시 삭제 중 오류가 발생했습니다'
    });
  }
});

// 현장 회신 게시판 조회
router.get('/field-reports', authMiddleware, async (req, res) => {
  try {
    console.log('📋 현장 회신 게시판 조회 요청');
    // 현장회신 테이블에서 직접 조회 (신규 스키마)
    const { FieldResponse } = require('../models');
    const rows = await FieldResponse.findAll({ order: [['created_at', 'DESC']] });
    const mapped = rows.map(r => ({
      id: r.id.toString(),
      managementNumber: r.managementNumber,
      workType: r.workType,
      operationTeam: r.operationTeam,
      equipmentName: r.equipmentName,
      representativeRuId: r.representativeRuId,
      summary: r.summary,
      createdAt: r.createdAt,
      adminChecked: !!r.adminChecked,
      adminCheckedAt: r.adminCheckedAt,
      // 현장회신은 완료된 작업에서만 생성되므로, 대시보드/보드에서 필터 용도로 'completed'로 고정 반환
      status: 'completed'
    }));
    console.log(`📊 현장 회신 ${mapped.length}건 조회됨`);
    res.json(mapped);

  } catch (error) {
    console.error('현장 회신 조회 오류:', error);
    res.status(500).json({
      error: '현장 회신 조회 중 오류가 발생했습니다'
    });
  }
});

// 현장 회신 전체 삭제 (관리자)
router.delete('/field-reports', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    console.log('🗑️ 현장 회신 전체 삭제 요청')
    const deletedCount = await FieldResponse.destroy({ where: {} })
    console.log(`✅ 현장 회신 삭제 완료: ${deletedCount}개`)
    res.json({ success: true, deletedCount })
  } catch (error) {
    console.error('현장 회신 전체 삭제 오류:', error)
    res.status(500).json({ success: false, error: '현장 회신 전체 삭제 중 오류' })
  }
})

// 회신 메모 저장
router.put('/:id/response-note', authMiddleware, async (req, res) => {
  try {
    const workOrder = await WorkOrder.findByPk(req.params.id);
    
    if (!workOrder) {
      return res.status(404).json({ error: '작업지시를 찾을 수 없습니다' });
    }

    // 기존 responseNote와 새 데이터 병합
    let existingNote = {};
    try {
      existingNote = typeof workOrder.response_note === 'string' 
        ? JSON.parse(workOrder.response_note) 
        : (workOrder.response_note || {});
    } catch {
      existingNote = {};
    }

    const updatedNote = {
      ...existingNote,
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    await workOrder.update({
      response_note: JSON.stringify(updatedNote),
      updatedAt: new Date()
    });

    console.log('✅ 회신 메모 저장 완료:', req.params.id);
    // 기존 field_responses 생성 로직은 비활성화 (새로운 response_notes 시스템 사용)
    // TODO: 기존 로직 제거됨 - 새로운 response_notes API 사용

    res.json({
      message: '회신 메모가 저장되었습니다',
      workOrder: {
        ...workOrder.toJSON(),
        response_note: updatedNote
      }
    });

  } catch (error) {
    console.error('회신 메모 저장 오류:', error);
    res.status(500).json({
      error: '회신 메모 저장 중 오류가 발생했습니다'
    });
  }
});

// 회신 메모 저장 후(또는 별도로) 현장회신 테이블에 기록
router.post('/:id/response-note/field-record', authMiddleware, async (req, res) => {
  try {
    const workOrder = await WorkOrder.findByPk(req.params.id);
    if (!workOrder) {
      return res.status(404).json({ error: '작업지시를 찾을 수 없습니다' });
    }

    // 관리번호 접미사 제거
    const baseMgmtNo = workOrder.managementNumber?.replace(/_(DU측|RU측)$/,'') || workOrder.managementNumber;

    const summary = (req.body?.summary || '').toString().trim();
    
    // 중복 체크: 같은 관리번호 + 유사한 요약 (첫 50자)이 있는지 확인
    const summaryPrefix = summary.slice(0, 50);
    const existingReport = await FieldResponse.findOne({
      where: {
        managementNumber: baseMgmtNo,
        summary: {
          [Op.like]: `${summaryPrefix}%`
        },
        createdBy: req.user.userId, // 같은 사용자가 작성한 것만 체크
        createdAt: {
          [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24시간 내
        }
      }
    });

    if (existingReport) {
      console.log('🚫 중복 현장회신 감지:', {
        managementNumber: baseMgmtNo,
        userId: req.user.userId,
        existingId: existingReport.id,
        summaryPrefix
      });
      
      return res.status(409).json({ 
        success: false, 
        error: '이미 유사한 현장회신이 24시간 내에 등록되었습니다. 기존 회신을 수정하거나 다른 내용으로 작성해주세요.',
        duplicateId: existingReport.id
      });
    }

    const record = await FieldResponse.create({
      workOrderId: workOrder.id?.toString(),
      managementNumber: baseMgmtNo,
      workType: workOrder.workType,
      operationTeam: workOrder.operationTeam,
      equipmentName: workOrder.equipmentName,
      representativeRuId: workOrder.representativeRuId,
      summary,
      status: 'active',
      adminChecked: false,
      createdBy: req.user.userId
    });

    console.log('✅ 현장회신 등록 완료:', {
      id: record.id,
      managementNumber: baseMgmtNo,
      userId: req.user.userId
    });

    res.json({ success: true, fieldResponse: record });
  } catch (error) {
    console.error('현장회신 기록 오류:', error);
    res.status(500).json({ success: false, error: '현장회신 기록 중 오류가 발생했습니다' });
  }
});

// 관리자 확인 처리 (체크/해제)
router.put('/field-responses/:fieldId/admin-check', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const { checked } = req.body; // boolean
    const record = await FieldResponse.findByPk(req.params.fieldId);
    if (!record) return res.status(404).json({ error: '현장회신 레코드를 찾을 수 없습니다' });
    await record.update({
      adminChecked: !!checked,
      adminCheckedAt: !!checked ? new Date() : null
    });
    res.json({ success: true, fieldResponse: record });
  } catch (error) {
    console.error('관리자 확인 처리 오류:', error);
    res.status(500).json({ success: false, error: '관리자 확인 처리 중 오류' });
  }
});

// 전체 작업지시 삭제 (관리자만) - 쿼리 파라미터 지원
router.delete('/', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    if (req.query.all === 'true') {
      console.log('🗑️ 전체 작업지시 삭제 요청 받음 (query all=true)');
    } else {
      console.log('🗑️ 전체 작업지시 삭제 요청 받음');
    }
    
    const deletedCount = await WorkOrder.destroy({
      where: {},
      truncate: false // truncate 대신 일반 삭제 사용
    });

    console.log(`✅ 전체 작업지시 삭제 완료: ${deletedCount}개`);
    res.json({
      ok: true,
      success: true,
      message: `${deletedCount}개의 작업지시가 삭제되었습니다`
    });

  } catch (error) {
    console.error('전체 삭제 오류:', error);
    res.status(500).json({
      ok: false,
      success: false,
      error: '전체 삭제 중 오류가 발생했습니다'
    });
  }
});

// 전체 작업지시 삭제 (관리자만) - 명시적 엔드포인트
router.delete('/clear-all', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    console.log('🗑️ 전체 작업지시 삭제 요청 받음 (/clear-all)');
    
    const deletedCount = await WorkOrder.destroy({
      where: {},
      truncate: false // truncate 대신 일반 삭제 사용
    });

    console.log(`✅ 전체 작업지시 삭제 완료: ${deletedCount}개`);
    res.json({
      success: true,
      message: `${deletedCount}개의 작업지시가 삭제되었습니다`
    });

  } catch (error) {
    console.error('전체 삭제 오류:', error);
    res.status(500).json({
      success: false,
      error: '전체 삭제 중 오류가 발생했습니다'
    });
  }
});

// 베이스 정보 API - 메모 작성용 기본 정보 조회
router.get('/:id/memo-base', authMiddleware, async (req, res) => {
  try {
    const workOrder = await WorkOrder.findByPk(req.params.id);
    
    if (!workOrder) {
      return res.status(404).json({ error: '작업지시를 찾을 수 없습니다' });
    }

    // side 결정: workType 기반
    let side = 'RU측'; // 기본값
    if (workOrder.workType === 'DU측') {
      side = 'DU측';
    }

    // 실제 RU명 추출 (ruInfoList에서 대표 RU ID에 해당하는 실제 RU명 찾기)
    let actualRuName = workOrder.representativeRuId;
    if (workOrder.ruInfoList && workOrder.representativeRuId) {
      try {
        const ruInfoList = typeof workOrder.ruInfoList === 'string' 
          ? JSON.parse(workOrder.ruInfoList) 
          : workOrder.ruInfoList;
        
        if (Array.isArray(ruInfoList)) {
          const foundRu = ruInfoList.find(ru => 
            ru.ruId === workOrder.representativeRuId || 
            ru.id === workOrder.representativeRuId
          );
          if (foundRu) {
            actualRuName = foundRu.ruName || foundRu.name || foundRu.equipmentName || actualRuName;
          }
        }
      } catch (error) {
        console.warn('RU 정보 파싱 실패:', error);
      }
    }

    // DU측은 집중국사명 (concentratorName5G), RU측은 실제 RU명
    const response = {
      workOrderId: parseInt(workOrder.id),
      status: workOrder.status || 'pending',
      side: side,
      operationTeam: workOrder.operationTeam || workOrder.team || '',
      managementNumber: workOrder.managementNumber || '',
      duName: workOrder.concentratorName5G || workOrder.duName || null, // DU측: 집중국사명
      ruName: actualRuName || workOrder.equipmentName || null, // RU측: 실제 RU명
      coSiteCount5g: workOrder.coSiteCount5G ? parseInt(workOrder.coSiteCount5G) : null
    };

    res.json(response);

  } catch (error) {
    console.error('베이스 정보 조회 오류:', error);
    res.status(500).json({
      error: '베이스 정보 조회 중 오류가 발생했습니다'
    });
  }
});

// 라벨 프린터용 데이터 조회 API
router.get('/:id/label-data', authMiddleware, async (req, res) => {
  try {
    const workOrder = await WorkOrder.findByPk(req.params.id);
    
    if (!workOrder) {
      return res.status(404).json({ error: '작업지시를 찾을 수 없습니다' });
    }

    // 라벨 프린터에 필요한 모든 칼럼 반환
    const labelData = {
      // 기본 정보
      managementNumber: workOrder.managementNumber || '',
      requestDate: workOrder.requestDate || '',
      duTeam: workOrder.operationTeam || '', // DU운용팀
      ruTeam: workOrder.operationTeam || '', // RU운용팀 (동일한 필드 사용)
      
      // RU/DU 정보
      ruId: workOrder.representativeRuId || '',
      ruName: workOrder.equipmentName || '',
      focus5gName: workOrder.concentratorName5G || '', // 5G 집중국명
      lineNumber: workOrder.lineNumber || '', // 회선번호
      lteMux: workOrder.lteMux || workOrder.muxInfo || '', // (LTE MUX / 국간,간선망)
      
      // 장비 정보
      equipmentLocation: workOrder.equipmentLocation || '',
      muxType: workOrder.muxType || '', // MUX종류
      serviceType: workOrder.serviceType || '', // 서비스구분
      duId: workOrder.duId || '',
      duName: workOrder.duName || '',
      channelCard: workOrder.channelCard || '',
      port: workOrder.port || ''
    };

    res.json(labelData);

  } catch (error) {
    console.error('라벨 데이터 조회 오류:', error);
    res.status(500).json({
      error: '라벨 데이터 조회 중 오류가 발생했습니다'
    });
  }
});

module.exports = router;