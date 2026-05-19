-- ============================================
-- 修复 exhibitor_booths 表的 RLS 策略
-- 添加 INSERT 权限，允许审图员和管理员创建展位记录
-- ============================================

-- 审图员可以创建展位信息
CREATE POLICY "审图员可以创建展位信息" ON public.exhibitor_booths
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'reviewer'
    )
  );

-- 管理员可以创建展位信息
CREATE POLICY "管理员可以创建展位信息" ON public.exhibitor_booths
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 展商可以创建自己的展位信息（虽然通常不会用到）
CREATE POLICY "展商可以创建自己的展位信息" ON public.exhibitor_booths
  FOR INSERT WITH CHECK (auth.uid() = user_id);
