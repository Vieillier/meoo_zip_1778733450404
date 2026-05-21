-- ============================================
-- 为 drawing_history 表的 booth_number 字段创建索引
-- 优化图纸历史记录的查询性能，减少卡顿
-- ============================================

CREATE INDEX IF NOT EXISTS idx_drawing_history_booth_number ON public.drawing_history(booth_number);
