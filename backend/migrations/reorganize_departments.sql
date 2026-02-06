-- Room-Department Reorganization Migration Script
-- This script consolidates departments and reassigns rooms properly

BEGIN TRANSACTION;

-- Step 1: Create new Radiology & Laboratory department
INSERT OR IGNORE INTO departments (id, name) VALUES (28, 'Radiology & Laboratory');

-- Step 2: Merge Gyn (6) into Gynecology (25)
-- Update all users assigned to Gyn
UPDATE users SET department_id = 25 WHERE department_id = 6;

-- Update all rooms assigned to Gyn  
UPDATE rooms SET department_id = 25 WHERE department_id = 6;

-- Update queue entries
UPDATE queue SET target_dept = 'Gynecology' WHERE target_dept = 'Gyn';

-- Step 3: Merge Dental (19) into Dentistry (16)
-- Update all users assigned to Dental
UPDATE users SET department_id = 16 WHERE department_id = 19;

-- Update all rooms assigned to Dental
UPDATE rooms SET department_id = 16 WHERE department_id = 19;

-- Update queue entries
UPDATE queue SET target_dept = 'Dentistry' WHERE target_dept = 'Dental';

-- Step 4: Rename Paediatrics to Pediatrics
UPDATE departments SET name = 'Pediatrics' WHERE name = 'Paediatrics';
UPDATE queue SET target_dept = 'Pediatrics' WHERE target_dept = 'Paediatrics';

-- Step 5: Reassign procedure rooms to Radiology & Laboratory
-- Rooms: 1 (Phlebotomy), 2 (CT-Scan), 3 (MRI - room "4"), 4 (X-Ray - room "5"), 5 (Ultrasound - room "7")
UPDATE rooms SET department_id = 28 WHERE id IN (1, 2, 3, 4, 5);

-- Update queue entries to use new department name
UPDATE queue SET target_dept = 'Radiology & Laboratory' WHERE target_dept IN ('Phlebotomy', 'CT-Scan', 'MRI', 'X-Ray', 'Ultrasound', 'Procedure');

-- Step 6: Delete redundant departments
DELETE FROM departments WHERE id IN (6, 19, 20, 21, 22, 23, 24);

-- Step 7: Fix doctor room assignments
-- Ensure all doctors have valid room assignments
-- Doc1 (3): Family Medicine, Room 20 - OK
-- Doc2 (4): Cardiology, Room 9 - Need to verify Room 9 exists and is assigned to Cardiology
-- Charles (5): ENT, Room 21 - Need to verify Room 21 exists  
-- Gknd (6): Gyn -> Gynecology, needs room assignment

-- Verify Room 9 is assigned to Cardiology (if not, reassign or create)
UPDATE rooms SET department_id = 3 WHERE name = '9' AND department_id != 3;

-- Assign room to Gknd if not already assigned
UPDATE users SET room_number = '15' WHERE id = 6 AND (room_number IS NULL OR room_number = '');

COMMIT;

-- Verification queries
SELECT 'DEPARTMENTS AFTER CLEANUP:' as info;
SELECT id, name FROM departments ORDER BY name;

SELECT '' as separator;
SELECT 'ROOMS AFTER CLEANUP:' as info;
SELECT r.id, r.name as room_name, d.name as department FROM rooms r 
LEFT JOIN departments d ON r.department_id = d.id 
ORDER BY r.name;

SELECT '' as separator;
SELECT 'DOCTORS AFTER CLEANUP:' as info;
SELECT u.id, u.username, d.name as department, u.room_number FROM users u
LEFT JOIN departments d ON u.department_id = d.id
WHERE u.role_id = 2
ORDER BY u.username;
