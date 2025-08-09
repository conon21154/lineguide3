const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const iconv = require('iconv-lite');
const { Op } = require('sequelize');
const { WorkOrder } = require('../models');
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
  if (!val || typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  if (trimmed === '' || trimmed === '0' || trimmed === 'undefined' || trimmed === '-') return undefined;
  return trimmed;
};

const deSci = (val) => {
  if (!val) return undefined;
  const s = String(val).trim();
  if (/^\d+(\.\d+)?e\+?\d+$/i.test(s)) {
    const n = Number(s);
    if (Number.isFinite(n)) {
      return String(Math.round(n));
    }
  }
  return s;
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
      order: [['created_at', req.query.sortOrder || 'DESC']]
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
          groups[baseMgmt] = { rows: [] };
        }
        
        groups[baseMgmt].rows.push(raw);
        
        const ruInfo = `${raw['RU_명']} (${raw['서비스구분']}) - 채널카드:${raw['채널카드']} 포트:${raw['포트']}`;
        console.log(`📡 RU 정보 수집: ${ruInfo}`);

      } catch (error) {
        errors.push(`행 ${i + 1} 처리 오류: ${error.message}`);
        console.error(`행 ${i + 1} 오류:`, error);
      }
    }

    console.log(`📋 수집된 관리번호: ${Object.keys(groups).length}개`);

    // 2단계: 각 그룹을 RU작업 + DU작업 DTO로 변환
    const dtoList = [];

    for (const [baseMgmt, group] of Object.entries(groups)) {
      try {
        console.log(`🔧 ${baseMgmt} 통합 작업지시 생성: RU ${group.rows.length}개`);

        const first = group.rows[0];
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

        // DU측 작업지시 생성
        if (trimValue(first['DU운용팀'])) {
          const duDto = {
            id: `${baseMgmt}_DU측`,
            managementNumber: `${baseMgmt}_DU측`,
            requestDate: trimValue(first['요청일']),
            operationTeam: trimValue(first['DU운용팀']),
            
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
            customer_name: `${baseMgmt}_DU측`,
            team: trimValue(first['DU운용팀'])
          };

          console.log('🏢 DU측 작업지시 생성:', `${baseMgmt} → ${duDto.operationTeam}`);
          dtoList.push(duDto);
        }

        // RU측 작업지시 생성
        if (trimValue(first['RU운용팀'])) {
          const ruDto = {
            id: `${baseMgmt}_RU측`,
            managementNumber: `${baseMgmt}_RU측`,
            requestDate: trimValue(first['요청일']),
            operationTeam: trimValue(first['RU운용팀']),
            
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
            customer_name: `${baseMgmt}_RU측`,
            team: trimValue(first['RU운용팀'])
          };

          const ruSummary = ruInfoList.map(ru => ru.ruName?.split('_').pop() || 'Unknown').join(', ');
          console.log(`📡 RU측 작업지시 생성: ${baseMgmt} → ${ruDto.operationTeam} (${ruSummary})`);
          dtoList.push(ruDto);
        }

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

// 전체 작업지시 삭제 (관리자만) - 명시적 엔드포인트
router.delete('/clear-all', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    console.log('🗑️ 전체 작업지시 삭제 요청 받음');
    
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

// 전체 작업지시 삭제 (관리자만) - 백업 엔드포인트
router.delete('/', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const deletedCount = await WorkOrder.destroy({
      where: {},
      truncate: false
    });

    res.json({
      message: `${deletedCount}개의 작업지시가 삭제되었습니다`
    });

  } catch (error) {
    console.error('전체 삭제 오류:', error);
    res.status(500).json({
      error: '전체 삭제 중 오류가 발생했습니다'
    });
  }
});

module.exports = router;