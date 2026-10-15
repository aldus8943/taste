-- ====================================================================
-- [동네식당] Supabase 데이터베이스 통합 권한 & 스키마 (1회 복사 & 실행)
-- 이메일 자동인증, 테이블 권한(42501 해결), 프로필, 즐겨찾기, 리뷰, 신고
-- ====================================================================

-- 1. 기존 유저 및 데모 계정 이메일 인증 즉시 완료
UPDATE auth.users 
SET email_confirmed_at = now() 
WHERE email_confirmed_at IS NULL;

-- 2. 신규 가입자 자동 이메일 인증 완료 트리거 (이메일 발송 없이 즉시 가입/로그인 가능)
CREATE OR REPLACE FUNCTION public.auto_confirm_new_user()
RETURNS TRIGGER AS $$
BEGIN
    NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_auto_confirm
BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_new_user();


-- 3. 기본 확장 설치
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- 4. restaurants 테이블 (음식점 캐싱)
CREATE TABLE IF NOT EXISTS public.restaurants (
    id TEXT PRIMARY KEY,
    original_id TEXT NOT NULL,
    data_source TEXT NOT NULL DEFAULT '공공데이터포털',
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    sub_category TEXT,
    standard_industry_name TEXT,
    road_address TEXT NOT NULL,
    jibun_address TEXT,
    building_name TEXT,
    floor TEXT,
    dong_name TEXT,
    phone TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    has_coordinates BOOLEAN NOT NULL DEFAULT true,
    business_status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_restaurants_source_original UNIQUE (data_source, original_id)
);

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "누구나 음식점 조회 가능" ON public.restaurants;
CREATE POLICY "누구나 음식점 조회 가능" ON public.restaurants FOR SELECT USING (true);
DROP POLICY IF EXISTS "누구나 음식점 저장/수정 가능" ON public.restaurants;
CREATE POLICY "누구나 음식점 저장/수정 가능" ON public.restaurants FOR ALL USING (true);


-- 5. profiles 테이블 (회원 닉네임 및 관리자 권한)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nickname TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 신규 가입 시 프로필 자동 생성 함수 및 트리거
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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "누구나 프로필 조회 가능" ON public.profiles;
CREATE POLICY "누구나 프로필 조회 가능" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "프로필 수정/삽입 허용" ON public.profiles;
CREATE POLICY "프로필 수정/삽입 허용" ON public.profiles FOR ALL USING (true);


-- 6. reviews 테이블 (음식점 리뷰, 1~5점 별점, 다중 사진 base64/url)
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id TEXT NOT NULL,
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

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "누구나 공개 리뷰 조회 가능" ON public.reviews;
CREATE POLICY "누구나 공개 리뷰 조회 가능" ON public.reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "리뷰 등록 허용" ON public.reviews;
CREATE POLICY "리뷰 등록 허용" ON public.reviews FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "리뷰 수정 허용" ON public.reviews;
CREATE POLICY "리뷰 수정 허용" ON public.reviews FOR UPDATE USING (true);
DROP POLICY IF EXISTS "리뷰 삭제 허용" ON public.reviews;
CREATE POLICY "리뷰 삭제 허용" ON public.reviews FOR DELETE USING (true);


-- 7. favorites 테이블 (회원별 즐겨찾기)
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    restaurant_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_user_restaurant_favorite UNIQUE (user_id, restaurant_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_restaurant_id ON public.favorites(restaurant_id);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "즐겨찾기 조회 허용" ON public.favorites;
CREATE POLICY "즐겨찾기 조회 허용" ON public.favorites FOR SELECT USING (true);
DROP POLICY IF EXISTS "즐겨찾기 추가 허용" ON public.favorites;
CREATE POLICY "즐겨찾기 추가 허용" ON public.favorites FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "즐겨찾기 삭제 허용" ON public.favorites;
CREATE POLICY "즐겨찾기 삭제 허용" ON public.favorites FOR DELETE USING (true);


-- 8. reports 테이블 (리뷰 신고 및 관리 기능)
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

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "신고 조회 허용" ON public.reports;
CREATE POLICY "신고 조회 허용" ON public.reports FOR SELECT USING (true);
DROP POLICY IF EXISTS "신고 제출 허용" ON public.reports;
CREATE POLICY "신고 제출 허용" ON public.reports FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "신고 상태 변경 허용" ON public.reports;
CREATE POLICY "신고 상태 변경 허용" ON public.reports FOR UPDATE USING (true);


-- 9. role_delegations 테이블 (관리자 권한 위임 및 이양 이력 관리)
CREATE TABLE IF NOT EXISTS public.role_delegations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_nickname TEXT NOT NULL,
    granted_by UUID REFERENCES auth.users(id),
    granted_by_nickname TEXT,
    granted_role TEXT NOT NULL DEFAULT 'admin' CHECK (granted_role IN ('user', 'admin')),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_role_delegations_target ON public.role_delegations(target_user_id);
CREATE INDEX IF NOT EXISTS idx_role_delegations_created ON public.role_delegations(created_at DESC);

ALTER TABLE public.role_delegations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "누구나 권한 이양 이력 조회 가능" ON public.role_delegations;
CREATE POLICY "누구나 권한 이양 이력 조회 가능" ON public.role_delegations FOR SELECT USING (true);
DROP POLICY IF EXISTS "권한 이양 이력 저장 허용" ON public.role_delegations;
CREATE POLICY "권한 이양 이력 저장 허용" ON public.role_delegations FOR INSERT WITH CHECK (true);


-- 10. 웹 클라이언트 권한 부여 (42501 permission denied 에러 완전 방지)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
