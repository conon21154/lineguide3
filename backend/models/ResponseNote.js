const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ResponseNote = sequelize.define('ResponseNote', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  workOrderId: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'work_order_id'
  },
  side: {
    type: DataTypes.ENUM('DU', 'RU'),
    allowNull: false,
    defaultValue: 'RU'
  },
  ruId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'ru_id'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'deleted_at'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'created_by'
  },
  confirmedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'confirmed_at'
  }
}, {
  tableName: 'response_notes',
  underscored: true,
  timestamps: true,
  paranoid: false, // deletedAt을 수동으로 관리
  indexes: [
    {
      fields: ['work_order_id']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['deleted_at']
    },
    {
      name: 'idx_response_notes_wo_side_deleted',
      fields: ['work_order_id', 'side', 'deleted_at']
    },
    {
      name: 'ux_response_note_active',
      unique: true,
      fields: ['work_order_id', 'side', { name: 'ru_id', length: 255 }],
      where: {
        deleted_at: null
      }
    }
  ]
});

module.exports = ResponseNote;