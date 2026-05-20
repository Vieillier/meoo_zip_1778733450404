# ✅ 虚拟文件数据清理方案

## 🔴 问题确认

根据你提供的信息：

1. ✅ **Supabase Storage 中没有这三个账号的文件**
   - 只有 `81A85` 这个展位号的文件夹
   - 没有 `17700000000`、`18800000000`、`19900000000` 的文件

2. ✅ **源代码中没有虚拟文件定义**
   - grep 搜索没有找到 mock/virtual/placeholder 数据

## 🎯 结论

这三个账号的文件是**虚拟的**，存储在数据库中但实际文件不存在。

## 🚀 清理方案

### 方案 A：删除虚拟数据（推荐）

#### 步骤 1：在 Supabase Dashboard 中运行 SQL

进入 SQL Editor，运行以下查询删除虚拟数据：

```sql
-- 删除图纸申报虚拟数据
DELETE FROM drawing_documents
WHERE booth_number IN ('17700000000', '18800000000', '19900000000');

-- 删除资质申报虚拟数据
DELETE FROM qualification_documents
WHERE booth_number IN ('17700000000', '18800000000', '19900000000');
```

#### 步骤 2：验证删除

运行以下查询验证数据已删除：

```sql
SELECT COUNT(*) as count
FROM drawing_documents
WHERE booth_number IN ('17700000000', '18800000000', '19900000000');

SELECT COUNT(*) as count
FROM qualification_documents
WHERE booth_number IN ('17700000000', '18800000000', '19900000000');
```

如果都返回 0，说明删除成功。

### 方案 B：清空虚拟 URL（保留记录）

如果你想保留这些账号的记录，但清空虚拟 URL：

```sql
-- 清空图纸申报的虚拟 URL
UPDATE drawing_documents
SET 
  effect_drawing_urls = '[]',
  elevation_grid_drawing_urls = '[]',
  plan_drawing_urls = '[]',
  structure_drawing_urls = '[]',
  material_drawing_urls = '[]',
  electrical_system_drawing_urls = '[]',
  utility_position_drawing_urls = '[]',
  fire_facility_drawing_urls = '[]'
WHERE booth_number IN ('17700000000', '18800000000', '19900000000');

-- 清空资质申报的虚拟 URL
UPDATE qualification_documents
SET 
  business_license_urls = '[]',
  application_letter_urls = '[]',
  entrustment_letter_urls = '[]',
  safety_responsibility_urls = '[]',
  volume_commitment_urls = '[]',
  violation_handling_urls = '[]',
  insurance_policy_urls = '[]',
  equipment_rental_urls = '[]',
  electrician_certificate_urls = '[]'
WHERE booth_number IN ('17700000000', '18800000000', '19900000000');
```

## 📋 建议

### 推荐：方案 A（删除虚拟数据）

**原因**：
- ✅ 这些是测试数据，不是真实数据
- ✅ 虚拟文件无法访问，保留没有意义
- ✅ 清理数据库，保持数据整洁

### 步骤

1. **备份数据**（可选）
   - 如果担心误删，先导出这些数据

2. **运行删除 SQL**
   - 在 Supabase Dashboard 中运行删除语句

3. **验证删除**
   - 运行验证查询确认删除成功

4. **测试应用**
   - 登录这三个账号
   - 确认预览窗口中没有虚拟文件了

## 🎯 执行步骤

### 步骤 1：登录 Supabase Dashboard

1. 进入你的 Supabase 项目
2. 点击 SQL Editor

### 步骤 2：运行删除语句

复制以下 SQL 并运行：

```sql
-- 删除虚拟数据
DELETE FROM drawing_documents
WHERE booth_number IN ('17700000000', '18800000000', '19900000000');

DELETE FROM qualification_documents
WHERE booth_number IN ('17700000000', '18800000000', '19900000000');
```

### 步骤 3：验证删除

运行以下查询验证：

```sql
SELECT COUNT(*) as drawing_count
FROM drawing_documents
WHERE booth_number IN ('17700000000', '18800000000', '19900000000');

SELECT COUNT(*) as qualification_count
FROM qualification_documents
WHERE booth_number IN ('17700000000', '18800000000', '19900000000');
```

### 步骤 4：测试应用

1. 刷新浏览器
2. 登录这三个账号
3. 进入资质申报和图纸申报
4. ✅ 预览窗口应该是空的了

## 📊 预期结果

**删除前**：
- 预览窗口显示虚拟文件
- 数据库中有虚拟 URL

**删除后**：
- 预览窗口为空
- 数据库中没有数据
- 用户可以正常上传真实文件

## ⚠️ 注意事项

- ✅ 这些是虚拟数据，删除不会影响真实数据
- ✅ 删除后用户可以重新上传真实文件
- ✅ 建议先备份，再删除

## 💡 总结

这三个账号的文件是虚拟的，建议删除这些虚拟数据，保持数据库整洁。
