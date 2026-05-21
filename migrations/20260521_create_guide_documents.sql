-- ============================================
-- 创建审图规范文档表（guide_documents）
-- 用于存储切分后的规范文档片段，支持向量搜索
-- ============================================

-- 创建表
CREATE TABLE IF NOT EXISTS public.guide_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  content_length INTEGER NOT NULL,
  sections TEXT[] DEFAULT '{}',  -- 包含的条款编号，如 ['3.12', '3.13']
  has_image BOOLEAN DEFAULT FALSE,  -- 是否包含图片链接
  metadata JSONB DEFAULT '{}',  -- 额外元数据
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_guide_documents_chunk_index ON public.guide_documents(chunk_index);
CREATE INDEX IF NOT EXISTS idx_guide_documents_sections ON public.guide_documents USING GIN(sections);
CREATE INDEX IF NOT EXISTS idx_guide_documents_has_image ON public.guide_documents(has_image);
CREATE INDEX IF NOT EXISTS idx_guide_documents_created_at ON public.guide_documents(created_at DESC);

-- 全文搜索索引（用于关键词搜索）
-- 注意：Supabase 默认不支持中文分词，使用 simple 配置
CREATE INDEX IF NOT EXISTS idx_guide_documents_content_search
  ON public.guide_documents USING GIN(to_tsvector('simple', content));

-- 添加注释
COMMENT ON TABLE public.guide_documents IS '审图规范文档片段表';
COMMENT ON COLUMN public.guide_documents.chunk_index IS '片段序号';
COMMENT ON COLUMN public.guide_documents.content IS '片段内容';
COMMENT ON COLUMN public.guide_documents.content_length IS '内容字数';
COMMENT ON COLUMN public.guide_documents.sections IS '包含的条款编号数组';
COMMENT ON COLUMN public.guide_documents.has_image IS '是否包含图片链接';
COMMENT ON COLUMN public.guide_documents.metadata IS '额外元数据（JSON格式）';

-- RLS 策略：所有已认证用户可读
ALTER TABLE public.guide_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "所有已认证用户可查看规范文档" ON public.guide_documents
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 只有审图员和管理员可以插入/更新/删除
CREATE POLICY "审图员和管理员可管理规范文档" ON public.guide_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('reviewer', 'admin')
    )
  );

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_guide_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_guide_documents_updated_at
  BEFORE UPDATE ON public.guide_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_guide_documents_updated_at();
