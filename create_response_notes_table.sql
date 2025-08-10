-- response_notes 테이블 생성 (존재하지 않는 경우)
CREATE TABLE IF NOT EXISTS response_notes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  work_order_id VARCHAR(255) NOT NULL,
  side ENUM('DU','RU') NOT NULL DEFAULT 'RU',
  ru_id VARCHAR(255) NULL,
  content TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  deleted_at DATETIME NULL,
  created_by INT NULL,
  
  -- 유니크 제약 (deleted_at이 NULL인 경우만)
  INDEX idx_work_order_id (work_order_id),
  INDEX idx_created_at (created_at),
  INDEX idx_deleted_at (deleted_at)
);

-- 유니크 인덱스 생성 (MySQL 8.0 이상에서 지원하는 함수 인덱스 사용)
-- MySQL 5.7 이하에서는 트리거로 구현해야 할 수 있음
CREATE UNIQUE INDEX ux_response_note_active
ON response_notes (work_order_id, side, IFNULL(ru_id, ''))
WHERE deleted_at IS NULL;