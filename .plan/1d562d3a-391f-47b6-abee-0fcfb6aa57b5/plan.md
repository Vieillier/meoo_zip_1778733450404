# 审图平台功能扩展计划

## 需求概述

### 1. 审图员界面新增两个板块
- 【申报情况】- 包含"展商申报情况总览表"
- 【特装审图】- 待设计

### 2. 标摊账号界面新增三个板块
- 【展位配套设施申请】- 包含五个区域表格（展具申请、网点申请、用电申请、用水申请、用气申请）
- 【楣板信息提交】- 待设计
- 【开票信息及缴费】- 待设计

### 3. 数据流转
- 标摊账号提交数据 → 审图员【申报情况】总览表
- 审图员可刷新查看最新情况
- 审图员可标记缴费状态

### 4. 申报情况总览表筛选功能
- 展馆号、展位号、申报类别、申报内容、申报时间、缴费情况
- 申报详情及缴费通知填写（跳转详情页）

## 详细需求确认

### 申报类别（5个独立类别）
1. **展具** - 包含桌柜类、展示柜类、椅凳沙发类、电器及灯具类、其他设施
2. **网点** - 包含直线类（市内/国内/国际直线）、专线类（10m-100m专线）
3. **用电** - 包含照明电箱（15a-300a）、机械电箱（15a-300a）
4. **用水** - 展台用水dn15mm、机器用水dn20mm
5. **用气** - 空压机（<=0.4m3/min、<=0.9m3/min、>=1.0m3/min）

### 区域确认逻辑
- 每个区域（展具/网点/用电/用水/用气）有独立的【确认】和【不申报】按钮
- 点击【确认】后该区域锁定，数据暂存
- 五个区域全部确认后，点击板块总【提交】按钮一次性提交所有数据

### 总览表显示字段
- 展商名称、展馆号、展位号、申报类别、申报内容、申报时间、缴费状态、操作

## 数据库设计

### 新表：exhibitor_applications（展商申报表）
```sql
CREATE TABLE public.exhibitor_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booth_id UUID REFERENCES public.exhibitor_booths(id),

  -- 申报类别: furniture(展具), network(网点), electricity(用电), water(用水), gas(用气)
  category VARCHAR(50) NOT NULL,

  -- 申报内容（JSON格式存储具体申请项）
  -- 例如: [{"item": "咨询台", "spec": "1000l*500w*750h", "unit": "个/期", "price": 100, "quantity": 2}]
  content JSONB NOT NULL DEFAULT '[]',

  -- 申报状态: pending(待审核), confirmed(已确认), submitted(已提交)
  status VARCHAR(20) DEFAULT 'pending',

  -- 缴费状态: unpaid(未缴费), paid(已缴费)
  payment_status VARCHAR(20) DEFAULT 'unpaid',

  -- 申报时间
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- 审图员备注
  reviewer_notes TEXT
);

-- 创建索引
CREATE INDEX idx_applications_user_id ON public.exhibitor_applications(user_id);
CREATE INDEX idx_applications_category ON public.exhibitor_applications(category);
CREATE INDEX idx_applications_status ON public.exhibitor_applications(status);
```

### 新表：meiban_submissions（楣板信息表）
```sql
CREATE TABLE public.meiban_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booth_id UUID REFERENCES public.exhibitor_booths(id),

  -- 楣板内容
  content TEXT NOT NULL,

  -- 提交状态: submitted(已提交), reviewed(已审核)
  status VARCHAR(20) DEFAULT 'submitted',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 新表：invoice_payments（开票及缴费信息表）
```sql
CREATE TABLE public.invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booth_id UUID REFERENCES public.exhibitor_booths(id),

  -- 开票信息
  invoice_title VARCHAR(255),
  invoice_tax_number VARCHAR(50),
  invoice_address TEXT,
  invoice_phone VARCHAR(50),
  invoice_bank VARCHAR(100),
  invoice_account VARCHAR(50),

  -- 缴费金额
  amount DECIMAL(10, 2),

  -- 缴费状态: unpaid(未缴费), paid(已缴费)
  payment_status VARCHAR(20) DEFAULT 'unpaid',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 前端组件规划

### 审图员界面
1. `ReviewerDashboard.tsx` - 主面板，包含Tab切换（用户管理、申报情况、特装审图）
2. `ApplicationOverview.tsx` - 申报情况总览表，包含筛选功能
3. `CustomBoothReview.tsx` - 特装审图（占位）
4. `ApplicationDetail.tsx` - 申报详情及缴费通知填写页

### 标摊账号界面
1. `StandardExhibitorDashboard.tsx` - 重构现有界面，添加Tab（基础信息、展位配套设施申请、楣板信息提交、开票信息及缴费）
2. `FacilityApplication.tsx` - 展位配套设施申请主组件
   - `FurnitureTable.tsx` - 展具申请表格（5个子类别）
   - `NetworkTable.tsx` - 网点申请表格（直线类+专线类）
   - `ElectricityTable.tsx` - 用电申请表格（照明+机械电箱）
   - `WaterTable.tsx` - 用水申请表格
   - `GasTable.tsx` - 用气申请表格
3. `MeibanSubmission.tsx` - 楣板信息提交
4. `InvoicePayment.tsx` - 开票信息及缴费

## Edge Functions
1. `submit-application` - 提交申报（支持批量提交多个类别）
2. `update-payment-status` - 更新缴费状态
3. `get-applications` - 获取申报列表（支持筛选）
4. `get-application-detail` - 获取申报详情

## 数据结构定义

### 展具申请项
```typescript
interface FurnitureItem {
  item: string;        // 项目名称，如"咨询台"
  spec: string;        // 规格，如"1000l*500w*750h"
  unit: string;        // 单位，如"个/期"
  price: number;       // 单价
  deposit: number;     // 押金
  quantity: number;    // 申报数量
  subtotal: number;    // 小计
}
```

### 网点申请项
```typescript
interface NetworkItem {
  type: string;        // 类型：直线类/专线类
  item: string;        // 项目名称，如"市内直线"
  unit: string;        // 单位
  price: number;       // 单价
  deposit: number;     // 押金
  quantity: number;    // 申报数量
}
```

### 用电申请项
```typescript
interface ElectricityItem {
  type: string;        // 类型：照明/机械
  spec: string;        // 规格，如"15a/380v"
  unit: string;        // 单位
  price: number;       // 单价
  quantity: number;    // 申报数量
}
```

### 用水申请项
```typescript
interface WaterItem {
  item: string;        // 展台用水/机器用水
  spec: string;        // 规格，如"dn15mm"
  unit: string;        // 单位
  price: number;       // 单价
  quantity: number;    // 申报数量
}
```

### 用气申请项
```typescript
interface GasItem {
  item: string;        // 空压机规格
  spec: string;        // 详细规格，如"<=0.4立方/分,dn15,8bar"
  unit: string;        // 单位
  price: number;       // 单价
  quantity: number;    // 申报数量
}
```

## 实施步骤

### Phase 1: 数据库迁移
1. 创建 exhibitor_applications 表及索引
2. 创建 meiban_submissions 表
3. 创建 invoice_payments 表
4. 添加 RLS 策略（审图员可查看所有，展商只能查看自己的）

### Phase 2: Edge Functions
1. 实现 submit-application（支持批量提交）
2. 实现 update-payment-status
3. 实现 get-applications（支持筛选参数）
4. 实现 get-application-detail

### Phase 3: 标摊账号界面 - 展位配套设施申请
1. 创建 FacilityApplication 主组件
2. 实现 FurnitureTable（展具5个子类别）
3. 实现 NetworkTable（网点直线+专线）
4. 实现 ElectricityTable（用电照明+机械）
5. 实现 WaterTable（用水）
6. 实现 GasTable（用气）
7. 实现区域确认逻辑和总提交功能

### Phase 4: 审图员界面 - 申报情况
1. 重构 ReviewerDashboard 添加Tab
2. 实现 ApplicationOverview 总览表
3. 实现筛选功能（展馆号、展位号、申报类别等）
4. 实现缴费状态更新按钮
5. 实现详情页跳转

### Phase 5: 其他板块（后续迭代）
1. 楣板信息提交
2. 开票信息及缴费
3. 特装审图

### Phase 6: 测试验证
1. 标摊账号提交各类申报
2. 审图员查看总览表
3. 审图员更新缴费状态
4. 验证数据流转和筛选功能
