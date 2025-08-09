const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FieldResponse = sequelize.define('FieldResponse', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  workOrderId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'work_order_id'
  },
  managementNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'management_number'
  },
  workType: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'work_type'
  },
  operationTeam: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'operation_team'
  },
  equipmentName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'equipment_name'
  },
  representativeRuId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'representative_ru_id'
  },
  summary: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'active'
  },
  adminChecked: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'admin_checked'
  },
  adminCheckedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'admin_checked_at'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'created_by'
  }
}, {
  tableName: 'field_responses',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      fields: ['operation_team']
    }
  ]
});

module.exports = FieldResponse;


