-- 새로운 작업지시 추가 SQL
USE lineguide;

INSERT INTO work_orders (
    customer_name, 
    service_location, 
    work_content, 
    team, 
    status, 
    priority, 
    due_date, 
    created_by,
    created_at,
    updated_at
) VALUES 
-- 관리자 ID가 1이므로 created_by = 1
('홍길동', '부산시 해운대구 센텀중앙로 123', '5G 기지국 설치', 'A팀', 'pending', 'high', '2024-08-10 18:00:00', 1, NOW(), NOW()),
('김영수', '부산시 남구 대연로 456', '광케이블 점검', 'B팀', 'pending', 'normal', '2024-08-11 10:00:00', 1, NOW(), NOW()),
('박지영', '부산시 동래구 충렬대로 789', 'MUX 교체 작업', 'C팀', 'pending', 'urgent', '2024-08-12 14:00:00', 1, NOW(), NOW()),
('이민호', '부산시 부산진구 중앙대로 321', '회선 장애 복구', 'A팀', 'pending', 'urgent', '2024-08-10 16:00:00', 1, NOW(), NOW()),
('최서연', '부산시 연제구 중앙대로 654', '인터넷 속도 개선', 'B팀', 'pending', 'normal', '2024-08-13 09:00:00', 1, NOW(), NOW());