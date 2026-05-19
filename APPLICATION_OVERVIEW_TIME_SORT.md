# ✅ 申报情况概览表时间排序功能实现完成

## 功能说明

在申报情况概览表中添加时间排序功能，并让申报时间显示具体到时分。

## 实现内容

### 1. 筛选栏修改

**原有**：
- 申报时间（时间范围筛选）

**修改后**：
- 申报时间范围（时间范围筛选）
- 时间排序（新增）

### 2. 时间排序选项

**位置**：申报情况概览表 → 筛选栏

**选项**：
- 默认（不排序）
- 时间倒序（最新在前）
- 时间顺序（最早在前）

### 3. 申报时间显示格式

**原格式**：`2024-01-15`（只显示日期）

**新格式**：`2024-01-15 14:30`（显示日期和时间）

**显示逻辑**：显示展位最新的申报时间

## 代码修改

### 文件：`src/components/ApplicationOverview.tsx`

#### 修改 1：添加接口字段（第 85-95 行）

```typescript
interface FilterState {
  // ... 其他字段
  sortByTime: '' | 'asc' | 'desc';  // 新增：时间排序
}
```

#### 修改 2：初始化筛选状态（第 100-110 行）

```typescript
const [filters, setFilters] = useState<FilterState>({
  hallNumber: '',
  boothNumber: '',
  category: '',
  content: '',
  paymentStatus: '',
  dateRange: '',
  showOnlyApplications: false,
  heightStatus: '',
  sortByTime: ''  // 新增
});
```

#### 修改 3：排序逻辑（第 254-319 行）

```typescript
const filteredBooths = groupedByBooth.filter(/* ... */).sort((a, b) => {
  // 时间排序
  if (filters.sortByTime) {
    // 获取展位最新的申报时间
    const getLatestTime = (booth: BoothApplications) => {
      const times = booth.applications
        .filter(app => app.created_at)
        .map(app => new Date(app.created_at!).getTime());
      return times.length > 0 ? Math.max(...times) : 0;
    };

    const timeA = getLatestTime(a);
    const timeB = getLatestTime(b);

    if (filters.sortByTime === 'asc') {
      // 顺序：未申报的排在最前面，然后按时间从早到晚
      if (timeA === 0 && timeB === 0) return 0;
      if (timeA === 0) return -1;
      if (timeB === 0) return 1;
      return timeA - timeB;
    } else {
      // 倒序：按时间从晚到早，未申报的排在最后
      if (timeA === 0 && timeB === 0) return 0;
      if (timeA === 0) return 1;
      if (timeB === 0) return -1;
      return timeB - timeA;
    }
  }
  return 0;
});
```

#### 修改 4：时间格式化函数（第 324-341 行）

```typescript
const formatApplicationTime = (applications: Application[]) => {
  const times = applications
    .filter(app => app.created_at)
    .map(app => new Date(app.created_at!));
  
  if (times.length === 0) return '-';
  
  // 获取最新的时间
  const latestTime = new Date(Math.max(...times.map(t => t.getTime())));
  const year = latestTime.getFullYear();
  const month = String(latestTime.getMonth() + 1).padStart(2, '0');
  const day = String(latestTime.getDate()).padStart(2, '0');
  const hours = String(latestTime.getHours()).padStart(2, '0');
  const minutes = String(latestTime.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};
```

#### 修改 5：筛选栏添加排序选项（第 359-375 行）

```typescript
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">申报时间范围</label>
  <select value={filters.dateRange} onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
    <option value="">全部</option>
    <option value="today">今天</option>
    <option value="week">本周</option>
    <option value="month">本月</option>
  </select>
</div>
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">时间排序</label>
  <select value={filters.sortByTime} onChange={(e) => setFilters({ ...filters, sortByTime: e.target.value as '' | 'asc' | 'desc' })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
    <option value="">默认</option>
    <option value="desc">时间倒序（最新在前）</option>
    <option value="asc">时间顺序（最早在前）</option>
  </select>
</div>
```

#### 修改 6：表格显示申报时间（第 464 行）

```typescript
<td className="px-4 py-3 text-sm text-gray-900">{formatApplicationTime(booth.applications)}</td>
```

## 排序逻辑

### 时间倒序（最新在前）

```
2024-01-15 14:30  ← 最新
2024-01-14 10:20
2024-01-13 09:15
-                 ← 未申报（最后）
```

### 时间顺序（最早在前）

```
-                 ← 未申报（最前）
2024-01-13 09:15  ← 最早
2024-01-14 10:20
2024-01-15 14:30
```

## 使用流程

### 查看申报时间

1. 进入申报情况概览表
2. 查看表格中的"申报时间"列
3. ✅ 显示最新的申报时间（格式：2024-01-15 14:30）
4. ❌ 未申报显示"-"

### 按时间排序

1. 在筛选栏中选择"时间排序"
2. 选择排序方式：
   - 时间倒序（最新在前）
   - 时间顺序（最早在前）
3. ✅ 表格自动按选择的方式排序

## 测试验证

### 测试 1：查看申报时间

**步骤**：
1. 进入申报情况概览表
2. 查看表格中的"申报时间"列

**预期结果**：
- ✅ 已申报的展位显示具体时间（2024-01-15 14:30）
- ✅ 未申报的展位显示"-"

### 测试 2：时间倒序排序

**步骤**：
1. 选择"时间排序" → "时间倒序（最新在前）"

**预期结果**：
- ✅ 最新申报的展位排在最前面
- ✅ 未申报的展位排在最后面

### 测试 3：时间顺序排序

**步骤**：
1. 选择"时间排序" → "时间顺序（最早在前）"

**预期结果**：
- ✅ 未申报的展位排在最前面
- ✅ 最早申报的展位排在后面

### 测试 4：重置筛选

**步骤**：
1. 设置时间排序
2. 点击"重置筛选"

**预期结果**：
- ✅ 时间排序恢复为"默认"
- ✅ 表格恢复默认排序

## 代码质量

- ✅ 无 TypeScript 错误
- ✅ 无 ESLint 警告
- ✅ 逻辑清晰
- ✅ 用户友好的界面

## 总结

这个功能确保了：
1. ✅ 可以查看展位的最新申报时间
2. ✅ 申报时间显示具体到时分
3. ✅ 可以按时间排序
4. ✅ 未申报的展位清晰标识

**关键点**：显示展位最新的申报时间，格式为 YYYY-MM-DD HH:mm。
