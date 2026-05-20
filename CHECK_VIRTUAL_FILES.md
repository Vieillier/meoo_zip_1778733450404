# 检查三个账号的文件数据

你想检查这三个账号（17700000000、18800000000、19900000000）下的资质申报和图纸申报预览中的文件是否是虚拟的或源代码写死的。

## 🔍 检查方法

### 方法 1：直接查看 Supabase 数据库

1. **登录 Supabase Dashboard**
   - 进入你的 Supabase 项目
   - 点击 SQL Editor

2. **查询图纸申报数据**
   ```sql
   SELECT booth_number, 
          effect_drawing_urls,
          elevation_grid_drawing_urls,
          plan_drawing_urls,
          structure_drawing_urls,
          material_drawing_urls,
          electrical_system_drawing_urls,
          utility_position_drawing_urls,
          fire_facility_drawing_urls
   FROM drawing_documents
   WHERE booth_number IN ('17700000000', '18800000000', '19900000000');
   ```

3. **查询资质申报数据**
   ```sql
   SELECT booth_number,
          business_license_urls,
          application_letter_urls,
          entrustment_letter_urls,
          safety_responsibility_urls,
          volume_commitment_urls,
          violation_handling_urls,
          insurance_policy_urls,
          equipment_rental_urls,
          electrician_certificate_urls
   FROM qualification_documents
   WHERE booth_number IN ('17700000000', '18800000000', '19900000000');
   ```

### 方法 2：检查 Supabase Storage 存储桶

1. **进入 Supabase Dashboard**
   - 点击 Storage
   - 查看 `qualification-documents` 存储桶

2. **搜索这三个展位号的文件**
   - 搜索 `17700000000`
   - 搜索 `18800000000`
   - 搜索 `19900000000`

3. **如果没有找到文件**
   - 说明这些文件是虚拟的或源代码写死的

### 方法 3：检查源代码中的虚拟文件

搜索源代码中是否有硬编码的文件 URL：

```bash
# 在项目根目录运行
grep -r "17700000000\|18800000000\|19900000000" src/
grep -r "https://example.com\|mock\|virtual\|placeholder" src/
```

## 📋 可能的情况

### 情况 1：数据库中有数据，Storage 中没有文件
- ✅ 文件 URL 是虚拟的
- ✅ 可能是测试数据
- ✅ 需要删除这些虚拟数据

### 情况 2：数据库中没有数据，但界面能显示
- ✅ 文件是源代码写死的
- ✅ 可能在组件中有 mock 数据
- ✅ 需要找到并删除 mock 数据

### 情况 3：数据库中有数据，Storage 中也有文件
- ✅ 文件是真实的
- ✅ 不需要删除

## 🎯 下一步

请告诉我：
1. 数据库中是否有这三个账号的数据？
2. Storage 中是否有这三个账号的文件？
3. 文件 URL 是什么格式？（例如：https://xxx.supabase.co/... 或其他）

有了这些信息，我可以帮你清理虚拟数据或源代码中的 mock 数据。
