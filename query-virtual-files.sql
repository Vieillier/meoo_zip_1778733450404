-- 检查三个账号的虚拟文件数据

-- 查询图纸申报数据
SELECT 
  booth_number,
  effect_drawing_urls,
  elevation_grid_drawing_urls,
  plan_drawing_urls,
  structure_drawing_urls,
  material_drawing_urls,
  electrical_system_drawing_urls,
  utility_position_drawing_urls,
  fire_facility_drawing_urls,
  created_at,
  updated_at
FROM drawing_documents
WHERE booth_number IN ('17700000000', '18800000000', '19900000000')
ORDER BY booth_number;

-- 查询资质申报数据
SELECT 
  booth_number,
  business_license_urls,
  application_letter_urls,
  entrustment_letter_urls,
  safety_responsibility_urls,
  volume_commitment_urls,
  violation_handling_urls,
  insurance_policy_urls,
  equipment_rental_urls,
  electrician_certificate_urls,
  created_at,
  updated_at
FROM qualification_documents
WHERE booth_number IN ('17700000000', '18800000000', '19900000000')
ORDER BY booth_number;
