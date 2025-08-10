-- response_notes 테이블 스키마 변경 및 데이터 정리
-- 1. 컬럼 추가
ALTER TABLE response_notes 
  ADD COLUMN side ENUM('DU','RU') NOT NULL DEFAULT 'RU',
  ADD COLUMN ru_id VARCHAR(255) NULL,
  ADD COLUMN deleted_at DATETIME NULL,
  ADD COLUMN updated_at DATETIME NULL;

-- 2. 기존 중복 데이터 정리 (work_order_id + side + ru_id 기준으로 최신 1건만 유지)
UPDATE response_notes r1
SET deleted_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM (
    SELECT work_order_id, side, IFNULL(ru_id, '') as ru_id, MAX(created_at) as latest_created
    FROM response_notes 
    WHERE deleted_at IS NULL
    GROUP BY work_order_id, side, IFNULL(ru_id, '')
    HAVING COUNT(*) > 1
  ) r2
  WHERE r1.work_order_id = r2.work_order_id
    AND r1.side = r2.side  
    AND IFNULL(r1.ru_id, '') = r2.ru_id
    AND r1.created_at < r2.latest_created
    AND r1.deleted_at IS NULL
);

-- 3. 유니크 인덱스 생성 (deleted_at이 NULL인 경우만)
CREATE UNIQUE INDEX ux_response_note
ON response_notes (work_order_id, side, ru_id)
WHERE deleted_at IS NULL;

-- 4. 기존 데이터의 side 값 설정 (work_orders 테이블의 workType 기반)
UPDATE response_notes rn
JOIN work_orders wo ON rn.work_order_id = wo.id
SET rn.side = CASE 
  WHEN wo.workType = 'DU측' THEN 'DU'
  WHEN wo.workType = 'RU측' THEN 'RU'
  ELSE 'RU'
END
WHERE rn.deleted_at IS NULL;

-- 5. ru_id 값 설정 (work_orders 테이블의 representativeRuId 기반)
UPDATE response_notes rn
JOIN work_orders wo ON rn.work_order_id = wo.id
SET rn.ru_id = wo.representativeRuId
WHERE rn.deleted_at IS NULL AND wo.representativeRuId IS NOT NULL;