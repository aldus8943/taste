-- ====================================================================
-- 회원가입/프로필, 즐겨찾기, 리뷰 및 사진, 신고/관리 기능 Supabase 마이그레이션
-- ====================================================================

-- 1. profiles 테이블 (회원 프로필 & 관리자 권한)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nickname TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 신규 유저 가입 시 자동으로 profiles 레코드를 생성하는 함수 & 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, nickname, avatar_url, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        COALESCE(NEW.raw_user_meta_data->>'role', 'user')
    )
    ON CONFLICT (id) DO UPDATE
    SET nickname = EXCLUDED.nickname;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- profiles RLS 정책
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "누구나 프로필 조회 가능" ON public.profiles;
CREATE POLICY "누구나 프로필 조회 가능"
    ON public.profiles FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "본인 프로필 수정 가능" ON public.profiles;
CREATE POLICY "본인 프로필 수정 가능"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "서비스 롤 프로필 전체 권한" ON public.profiles;
CREATE POLICY "서비스 롤 프로필 전체 권한"
    ON public.profiles FOR ALL
    TO service_role
    USING (true);


-- 2. favorites 테이블 (회원별 음식점 즐겨찾기)
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_user_restaurant_favorite UNIQUE (user_id, restaurant_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_restaurant_id ON public.favorites(restaurant_id);

-- favorites RLS 정책
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "본인의 즐겨찾기만 조회 가능" ON public.favorites;
CREATE POLICY "본인의 즐겨찾기만 조회 가능"
    ON public.favorites FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "로그인한 유저는 즐겨찾기 추가 가능" ON public.favorites;
CREATE POLICY "로그인한 유저는 즐겨찾기 추가 가능"
    ON public.favorites FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "본인의 즐겨찾기만 삭제 가능" ON public.favorites;
CREATE POLICY "본인의 즐겨찾기만 삭제 가능"
    ON public.favorites FOR DELETE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "서비스 롤 즐겨찾기 전체 권한" ON public.favorites;
CREATE POLICY "서비스 롤 즐겨찾기 전체 권한"
    ON public.favorites FOR ALL
    TO service_role
    USING (true);


-- 3. reviews 테이블 (음식점 리뷰, 별점, 사진)
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_nickname TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    content TEXT NOT NULL,
    photo_urls TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reviews_restaurant_id ON public.reviews(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews(status);

-- reviews RLS 정책
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "공개된 리뷰는 누구나 조회 가능" ON public.reviews;
CREATE POLICY "공개된 리뷰는 누구나 조회 가능"
    ON public.reviews FOR SELECT
    USING (
        status = 'published' 
        OR auth.uid() = user_id 
        OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );

DROP POLICY IF EXISTS "로그인한 유저는 리뷰 작성 가능" ON public.reviews;
CREATE POLICY "로그인한 유저는 리뷰 작성 가능"
    ON public.reviews FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "작성자 또는 관리자는 리뷰 수정 가능" ON public.reviews;
CREATE POLICY "작성자 또는 관리자는 리뷰 수정 가능"
    ON public.reviews FOR UPDATE
    USING (
        auth.uid() = user_id 
        OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );

DROP POLICY IF EXISTS "작성자 또는 관리자는 리뷰 삭제 가능" ON public.reviews;
CREATE POLICY "작성자 또는 관리자는 리뷰 삭제 가능"
    ON public.reviews FOR DELETE
    USING (
        auth.uid() = user_id 
        OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );

DROP POLICY IF EXISTS "서비스 롤 리뷰 전체 권한" ON public.reviews;
CREATE POLICY "서비스 롤 리뷰 전체 권한"
    ON public.reviews FOR ALL
    TO service_role
    USING (true);


-- 4. reports 테이블 (리뷰 신고 및 관리 기능)
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reporter_nickname TEXT,
    reason TEXT NOT NULL,
    detail TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved_blind', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_reports_review_id ON public.reports(review_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);

-- reports RLS 정책
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "신고자 또는 관리자만 신고 내역 조회 가능" ON public.reports;
CREATE POLICY "신고자 또는 관리자만 신고 내역 조회 가능"
    ON public.reports FOR SELECT
    USING (
        auth.uid() = reporter_id 
        OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );

DROP POLICY IF EXISTS "로그인한 유저는 신고 제출 가능" ON public.reports;
CREATE POLICY "로그인한 유저는 신고 제출 가능"
    ON public.reports FOR INSERT
    WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "관리자만 신고 처리 상태 수정 가능" ON public.reports;
CREATE POLICY "관리자만 신고 처리 상태 수정 가능"
    ON public.reports FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );

DROP POLICY IF EXISTS "서비스 롤 신고 전체 권한" ON public.reports;
CREATE POLICY "서비스 롤 신고 전체 권한"
    ON public.reports FOR ALL
    TO service_role
    USING (true);


-- 5. 식당별 평점 및 리뷰 수 자동 집계 함수
CREATE OR REPLACE FUNCTION public.get_restaurant_review_stats(target_restaurant_id TEXT)
RETURNS TABLE (
    average_rating NUMERIC,
    total_reviews BIGINT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(ROUND(AVG(rating)::numeric, 1), 0.0) AS average_rating,
        COUNT(*)::bigint AS total_reviews
    FROM public.reviews
    WHERE restaurant_id = target_restaurant_id AND status = 'published';
END;
$$;
