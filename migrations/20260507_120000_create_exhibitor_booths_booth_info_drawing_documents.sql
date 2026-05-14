-- ============================================
-- 由用户找回的 database_schema.sql 整合而来
-- 仅包含此前迁移链中缺失的建表；避免与下列文件重复：
--   20260506_044012 (profiles / user_role / auth 触发器)
--   20260509, 20260511, 20260512*, 20260513_*（其余业务表及 RLS）
-- 执行顺序：紧接在 20260506_044012 之后、20260508_015401 之前
-- ============================================

-- ---------------------------------------------------------------------------
-- exhibitor_booths（找回 DDL；user_id 改为 auth.users 以与 20260509 等一致）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exhibitor_booths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exhibitor_name TEXT NOT NULL,
  hall_number TEXT,
  booth_number TEXT NOT NULL,
  booth_area NUMERIC DEFAULT 9,
  booth_height NUMERIC DEFAULT 4,
  booth_category TEXT DEFAULT '标摊',
  contact_name TEXT,
  contact_phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.exhibitor_booths IS '参展商展位表';
COMMENT ON COLUMN public.exhibitor_booths.booth_category IS '展位类别：标摊/特装';

CREATE INDEX IF NOT EXISTS idx_exhibitor_booths_user_id ON public.exhibitor_booths(user_id);
CREATE INDEX IF NOT EXISTS idx_exhibitor_booths_booth_number ON public.exhibitor_booths(booth_number);
CREATE INDEX IF NOT EXISTS idx_exhibitor_booths_hall_number ON public.exhibitor_booths(hall_number);
CREATE INDEX IF NOT EXISTS idx_exhibitor_booths_category ON public.exhibitor_booths(booth_category);

DO $$
BEGIN
  ALTER TABLE public.exhibitor_booths
    ADD CONSTRAINT unique_user_booth UNIQUE (user_id, booth_number);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- booth_info、drawing_documents（原导出中的定义；RLS 需配套策略，见文末）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booth_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booth_number TEXT NOT NULL,
  booth_height_type TEXT,
  need_screen BOOLEAN DEFAULT false,
  screen_specification TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.booth_info IS '展位信息表';

CREATE INDEX IF NOT EXISTS idx_booth_info_number ON public.booth_info(booth_number);

DO $$
BEGIN
  ALTER TABLE public.booth_info ADD CONSTRAINT unique_booth_info_number UNIQUE (booth_number);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.drawing_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booth_number TEXT NOT NULL,
  effect_drawing_urls TEXT[] DEFAULT '{}',
  elevation_grid_drawing_urls TEXT[] DEFAULT '{}',
  plan_drawing_urls TEXT[] DEFAULT '{}',
  structure_drawing_urls TEXT[] DEFAULT '{}',
  material_drawing_urls TEXT[] DEFAULT '{}',
  electrical_system_drawing_urls TEXT[] DEFAULT '{}',
  utility_position_drawing_urls TEXT[] DEFAULT '{}',
  fire_facility_drawing_urls TEXT[] DEFAULT '{}',
  effect_drawing_status TEXT DEFAULT 'pending',
  elevation_grid_drawing_status TEXT DEFAULT 'pending',
  plan_drawing_status TEXT DEFAULT 'pending',
  structure_drawing_status TEXT DEFAULT 'pending',
  material_drawing_status TEXT DEFAULT 'pending',
  electrical_system_drawing_status TEXT DEFAULT 'pending',
  utility_position_drawing_status TEXT DEFAULT 'pending',
  fire_facility_drawing_status TEXT DEFAULT 'pending',
  effect_drawing_comment TEXT,
  elevation_grid_drawing_comment TEXT,
  plan_drawing_comment TEXT,
  structure_drawing_comment TEXT,
  material_drawing_comment TEXT,
  electrical_system_drawing_comment TEXT,
  utility_position_drawing_comment TEXT,
  fire_facility_drawing_comment TEXT,
  review_round INTEGER DEFAULT 0,
  last_reviewed_at TIMESTAMP WITHOUT TIME ZONE,
  reviewed_by TEXT,
  is_submitted BOOLEAN DEFAULT false,
  submitted_at TIMESTAMP WITHOUT TIME ZONE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.drawing_documents IS '图纸文档表';

CREATE INDEX IF NOT EXISTS idx_drawing_docs_booth ON public.drawing_documents(booth_number);
CREATE INDEX IF NOT EXISTS idx_drawing_docs_submitted ON public.drawing_documents(is_submitted);

DO $$
BEGIN
  ALTER TABLE public.drawing_documents ADD CONSTRAINT unique_drawing_docs_booth UNIQUE (booth_number);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- updated_at 触发器（原导出；仅挂在本文件新建的表上，避免与后续迁移重复）
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_exhibitor_booths_updated_at ON public.exhibitor_booths;
CREATE TRIGGER update_exhibitor_booths_updated_at
  BEFORE UPDATE ON public.exhibitor_booths
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_booth_info_updated_at ON public.booth_info;
CREATE TRIGGER update_booth_info_updated_at
  BEFORE UPDATE ON public.booth_info
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_drawing_docs_updated_at ON public.drawing_documents;
CREATE TRIGGER update_drawing_docs_updated_at
  BEFORE UPDATE ON public.drawing_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- booth_info / drawing_documents：开放策略（与同目录下 builder_info、drawing_history 一致）
ALTER TABLE public.booth_info ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "所有人可查看展位信息" ON public.booth_info;
DROP POLICY IF EXISTS "所有人可写入展位信息" ON public.booth_info;
DROP POLICY IF EXISTS "所有人可更新展位信息" ON public.booth_info;
CREATE POLICY "所有人可查看展位信息" ON public.booth_info FOR SELECT USING (true);
CREATE POLICY "所有人可写入展位信息" ON public.booth_info FOR INSERT WITH CHECK (true);
CREATE POLICY "所有人可更新展位信息" ON public.booth_info FOR UPDATE USING (true);

ALTER TABLE public.drawing_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "所有人可查看图纸文档" ON public.drawing_documents;
DROP POLICY IF EXISTS "所有人可写入图纸文档" ON public.drawing_documents;
DROP POLICY IF EXISTS "所有人可更新图纸文档" ON public.drawing_documents;
CREATE POLICY "所有人可查看图纸文档" ON public.drawing_documents FOR SELECT USING (true);
CREATE POLICY "所有人可写入图纸文档" ON public.drawing_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "所有人可更新图纸文档" ON public.drawing_documents FOR UPDATE USING (true);

-- exhibitor_booths 的 RLS 由 20260508_015401_add_exhibitor_booths_rls_policies.sql 统一添加，此处不 ENABLE，以免在策略创建前锁表。
