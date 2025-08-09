const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WorkOrder = sequelize.define('WorkOrder', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // 기본 정보
  managementNumber: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '관리번호'
  },
  requestDate: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '작업요청일'
  },
  workType: {
    type: DataTypes.ENUM('DU측', 'RU측'),
    allowNull: false,
    defaultValue: 'RU측',
    comment: '작업구분 (DU측 또는 RU측)'
  },
  operationTeam: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '운용팀'
  },
  ruOperationTeam: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'RU 운용팀'
  },
  
  // 장비 정보
  category: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '종류'
  },
  equipmentType: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '구분'
  },
  equipmentName: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '장비명'
  },
  serviceType: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '서비스 구분'
  },
  
  // 5G 관련 정보
  coSiteCount5G: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: '5G Co-Site 수량'
  },
  concentratorName5G: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '5G 집중국명'
  },
  
  // DU 정보
  duId: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'DU ID'
  },
  duName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'DU 명'
  },
  channelCard: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '채널카드'
  },
  port: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: '포트'
  },
  lineNumber: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '선번장'
  },
  
  // RU 정보
  representativeRuId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '대표 RU ID'
  },
  ruInfoList: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'RU 정보 리스트'
  },
  
  // 위치 정보
  serviceLocation: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '서비스 위치'
  },
  
  // 작업 내용
  workContent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '작업 내용'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '비고'
  },
  
  // 5G MUX 관련 필드들
  muxInfo: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '5G MUX 정보 (JSON 형태로 저장)'
  },
  
  // 응답 메모
  responseNote: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '현장 회신 메모 (JSON 형태로 저장)'
  },
  
  // 상태 관리
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  priority: {
    type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
    allowNull: false,
    defaultValue: 'normal'
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // 사용자 참조
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  assignedTo: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  updatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // 시간 정보
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // 라벨 프린터 관련 필드들
  labelPrinted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  labelPrintedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // 기존 호환성을 위한 필드들 (deprecated)
  customer_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      len: [1, 100]
    }
  },
  team: {
    type: DataTypes.STRING(50),
    allowNull: true,
    validate: {
      len: [1, 50]
    }
  },
  work_content: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  response_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // 추가 메타데이터
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '추가 메타데이터 (JSON 형태로 저장)'
  }
}, {
  tableName: 'work_orders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['status']
    },
    {
      fields: ['team']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['created_by']
    },
    {
      fields: ['assigned_to']
    },
    {
      fields: ['due_date']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['customer_name']
    },
    {
      fields: ['service_location']
    }
  ]
});

module.exports = WorkOrder;