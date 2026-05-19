# ✅ 特装审图提交时间排序功能实现完成

## 功能说明

在特装审图界面添加提交时间排序功能，并在表格中显示展商最后一次提交申报图纸的时间。

## 实现内容

### 1. 筛选栏新增"提交时间排序"选项

**位置**：特装审图界面 → 筛选栏

**选项**：
- 默认（不排序）
- 时间倒序（最新在前）
- 时间顺序（最早在前）

### 2. 表格新增"提交时间"列

**位置**：特装审图界面 → 表格

**显示内容**：
- 已提交：显示最后一次提交时间（格式：2024-01-15 14:30）
- 未提交：显示"未提交"（灰色文字）

### 3. 排序逻辑

#### 时间倒序（最新在前）
```
最新提交的展商 → 较早提交的展商 → 未提交的展商
```

#### 时间顺序（最早在前）
```
未提交的展商 → 最早提交的展商 → 较新提交的展商
```

## 代码修改

### 文件：`src/components/CustomBoothReview.tsx`

#### 修改 1：添加接口字段（第 10-38 行）

```typescript
interface BoothRecord {
  // ... 其他字段
  submitted_at?: string | null;  // 新增：提交时间
}

interface FilterState {
  // ... 其他字段
  sortByTime: '' | 'asc' | 'desc';  // 新增：时间排序
}
```

#### 修改 2：初始化筛选状态（第 43-49 行）

```typescript
const [filters, setFilters] = useState<FilterState>({
  hallNumber: '',
  boothNumber: '',
  exhibitorName: '',
  heightType: '',
  sortByTime: ''  // 新增
});
```

#### 修改 3：获取提交时间（第 55-105 行）

```typescript
const fetchCustomBooths = async () => {
  // ... 其他查询

  // 获取图纸提交时间
  const { data: drawingDocsData } = await supabase
    .from('drawing_documents')
    .select('booth_number, last_reviewed_at')
    .in('booth_number', boothNumbers);

  const mergedData = boothsData?.map(booth => {
    const drawingDoc = drawingDocsData?.find(doc => doc.booth_number === booth.booth_number);
    return {
      ...booth,
      submitted_at: drawingDoc?.last_reviewed_at || null  // 新增
    };
  });
};
```

#### 修改 4：排序逻辑（第 116-146 行）

```typescript
const filteredBooths = booths.filter(/* ... */).sort((a, b) => {
  // 时间排序
  if (filters.sortByTime) {
    const timeA = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
    const timeB = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
    
    if (filters.sortByTime === 'asc') {
      // 顺序：未提交的排在最前面，然后按时间从早到晚
      if (!a.submitted_at && !b.submitted_at) return 0;
      if (!a.submitted_at) return -1;
      if (!b.submitted_at) return 1;
      return timeA - timeB;
    } else {
      // 倒序：按时间从晚到早，未提交的排在最后
      if (!a.submitted_at && !b.submitted_at) return 0;
      if (!a.submitted_at) return 1;
      if (!b.submitted_at) return -1;
      return timeB - timeA;
    }
  }
  return 0;
});
```

#### 修改 5：时间格式化函数（第 150-165 行）

```typescript
const formatSubmittedTime = (time: string | null | undefined) => {
  if (!time) return '未提交';
  const date = new Date(time);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};
```

#### 修改 6：筛选栏添加排序选项（第 387-463 行）

```typescript
<div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
  {/* ... 其他筛选项 */}
  
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">提交时间排序</label>
    <select
      value={filters.sortByTime}
      onChange={(e) => setFilters({ ...filters, sortByTime: e.target.value as '' | 'asc' | 'desc' })}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    >
      <option value="">默认</option>
      <option value="desc">时间倒序（最新在前）</option>
      <option value="asc">时间顺序（最早在前）</option>
    </select>
  </div>
</div>
```

#### 修改 7：表格添加提交时间列（第 482-533 行）

```typescript
<thead className="bg-gray-50">
  <tr>
    <th>展馆号</th>
    <th>展位号</th>
    <th>展商名称</th>
    <th>展位面积</th>
    <th>高度类型</th>
    <th>提交时间</th>  {/* 新增 */}
    <th>联系人</th>
    <th>联系电话</th>
    <th>操作</th>
  </tr>
</thead>

<tbody>
  <tr>
    {/* ... 其他列 */}
    <td className="px-4 py-3 text-sm text-gray-900">
      <span className={booth.submitted_at ? 'text-gray-900' : 'text-gray-400'}>
        {formatSubmittedTime(booth.submitted_at)}
      </span>
    </td>
    {/* ... 其他列 */}
  </tr>
</tbody>
```

## 数据来源

### drawing_documents 表

**字段**：`last_reviewed_at`

**说明**：展商最后一次提交申报图纸或提交修改后申报的时间

**更新时机**：
- 展商首次提交图纸
- 展商修改图纸后重新提交

## 使用流程

### 查看提交时间

1. 进入特装审图界面
2. 查看表格中的"提交时间"列
3. ✅ 已提交：显示具体时间
4. ❌ 未提交：显示"未提交"

### 按时间排序

1. 在筛选栏中选择"提交时间排序"
2. 选择排序方式：
   - 时间倒序（最新在前）
   - 时间顺序（最早在前）
3. ✅ 表格自动按选择的方式排序

## 测试验证

### 测试 1：查看提交时间

**步骤**：
1. 进入特装审图界面
2. 查看表格中的"提交时间"列

**预期结果**：
- ✅ 已提交的展商显示具体时间
- ✅ 未提交的展商显示"未提交"（灰色）

### 测试 2：时间倒序排序

**步骤**：
1. 选择"提交时间排序" → "时间倒序（最新在前）"

**预期结果**：
- ✅ 最新提交的展商排在最前面
- ✅ 未提交的展商排在最后面

### 测试 3：时间顺序排序

**步骤**：
1. 选择"提交时间排序" → "时间顺序（最早在前）"

**预期结果**：
- ✅ 未提交的展商排在最前面
- ✅ 最早提交的展商排在后面

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
1. ✅ 可以查看展商的提交时间
2. ✅ 可以按时间排序
3. ✅ 未提交的展商清晰标识
4. ✅ 时间格式统一（YYYY-MM-DD HH:mm）

**关键点**：从 `drawing_documents` 表的 `last_reviewed_at` 字段获取展商最后一次提交的时间。
