# 登录界面角色预览功能计划

## 需求概述
在登录界面添加三个角色预览按钮：审图员、标摊展商、特装展商。点击后进入对应角色的界面预览模式，仅用于查看界面布局，所有数据用"测试预览"填充，不支持实际操作，仅支持板块间切换。

## 实现方案

### 1. 修改登录页面 (src/App.tsx 中的 LoginPage)
- 在登录表单下方添加三个角色预览按钮
- 按钮样式：使用不同颜色区分三个角色
  - 审图员：蓝色
  - 标摊展商：绿色
  - 特装展商：紫色

### 2. 创建预览模式状态
- 在 AuthContext 中添加 `isPreviewMode` 状态
- 添加 `enterPreviewMode(role)` 方法进入预览模式
- 预览模式下使用模拟数据而非真实数据

### 3. 修改受保护路由逻辑
- ProtectedRoute 组件支持预览模式绕过登录验证
- 预览模式下显示"预览中"标识

### 4. 创建预览数据
- 创建统一的预览数据对象，包含所有需要显示的字段
- 所有文本内容统一使用"测试预览"
- 表格数据生成3-5条模拟记录

### 5. 修改各组件支持预览模式
需要修改的组件：
- UserManagementPage (审图员工作台)
- ExhibitorDashboard (展商工作台)
- ApplicationOverview
- MeibanOverview
- CustomBoothReview
- FacilityApplication
- MeibanSubmission
- InvoicePayment
- QualificationDocuments
- DrawingSubmission
- BuilderInfo
- BoothInfo

修改方式：
- 检测预览模式，使用预览数据替代真实数据
- 禁用所有提交/保存/删除等操作按钮
- 保留界面切换功能

### 6. 预览模式退出
- 在预览界面顶部添加退出预览按钮
- 点击后返回登录页面

## 文件修改清单
1. src/App.tsx - 添加预览按钮和预览模式逻辑
2. src/components/ApplicationOverview.tsx - 支持预览数据
3. src/components/MeibanOverview.tsx - 支持预览数据
4. src/components/CustomBoothReview.tsx - 支持预览数据
5. src/components/FacilityApplication.tsx - 支持预览数据
6. src/components/MeibanSubmission.tsx - 支持预览数据
7. src/components/InvoicePayment.tsx - 支持预览数据
8. src/components/QualificationDocuments.tsx - 支持预览数据
9. src/components/DrawingSubmission.tsx - 支持预览数据
10. src/components/BuilderInfo.tsx - 支持预览数据
11. src/components/BoothInfo.tsx - 支持预览数据

## 预览数据规范
所有显示文本统一使用"测试预览"，包括：
- 展商名称
- 展馆号/展位号
- 联系人信息
- 申报内容
- 表格中的各项数据
- 状态标签

预览模式下禁用：
- 所有表单提交
- 所有保存操作
- 所有删除操作
- 所有上传操作
- 所有编辑操作

保留功能：
- Tab/板块切换
- 弹窗打开/关闭
- 筛选/搜索（使用预览数据）
- 表格分页
