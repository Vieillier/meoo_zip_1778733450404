-- ============================================
-- 创建审图规范文档表（guide_documents）- 向量搜索版
-- 用于存储切分后的规范文档片段，支持 RAG 检索增强
-- ============================================

-- 1. 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. 创建表
CREATE TABLE IF NOT EXISTS public.guide_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  content_length INTEGER NOT NULL,
  sections TEXT[] DEFAULT '{}',
  has_image BOOLEAN DEFAULT FALSE,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 创建基础索引
CREATE INDEX IF NOT EXISTS idx_guide_documents_chunk_index ON public.guide_documents(chunk_index);
CREATE INDEX IF NOT EXISTS idx_guide_documents_sections ON public.guide_documents USING GIN(sections);
CREATE INDEX IF NOT EXISTS idx_guide_documents_has_image ON public.guide_documents(has_image);
CREATE INDEX IF NOT EXISTS idx_guide_documents_created_at ON public.guide_documents(created_at DESC);

-- 4. 全文搜索索引
CREATE INDEX IF NOT EXISTS idx_guide_documents_content_search 
  ON public.guide_documents USING GIN(to_tsvector('simple', content));

-- 5. 向量相似度搜索索引（HNSW）
CREATE INDEX IF NOT EXISTS idx_guide_documents_embedding 
  ON public.guide_documents USING hnsw (embedding vector_cosine_ops);

-- 6. 添加注释
COMMENT ON TABLE public.guide_documents IS '审图规范文档片段表（支持向量搜索）';
COMMENT ON COLUMN public.guide_documents.chunk_index IS '片段序号';
COMMENT ON COLUMN public.guide_documents.content IS '片段内容';
COMMENT ON COLUMN public.guide_documents.content_length IS '内容字数';
COMMENT ON COLUMN public.guide_documents.sections IS '包含的条款编号数组';
COMMENT ON COLUMN public.guide_documents.has_image IS '是否包含图片链接';
COMMENT ON COLUMN public.guide_documents.embedding IS '文本向量（1536维，用于语义搜索）';
COMMENT ON COLUMN public.guide_documents.metadata IS '额外元数据（JSON格式）';

-- 7. RLS 策略
ALTER TABLE public.guide_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "所有已认证用户可查看规范文档" ON public.guide_documents
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "审图员和管理员可管理规范文档" ON public.guide_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('reviewer', 'admin')
    )
  );

-- 8. 创建更新时间触发器
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

-- 9. 创建向量相似度搜索函数
CREATE OR REPLACE FUNCTION match_guide_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  chunk_index int,
  content text,
  sections text[],
  has_image boolean,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gd.id,
    gd.chunk_index,
    gd.content,
    gd.sections,
    gd.has_image,
    1 - (gd.embedding <=> query_embedding) as similarity
  FROM public.guide_documents gd
  WHERE gd.embedding IS NOT NULL
    AND 1 - (gd.embedding <=> query_embedding) > match_threshold
  ORDER BY gd.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_guide_documents IS 'RAG 向量相似度搜索函数';
