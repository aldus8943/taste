-- ====================================================================
-- 우리 동네 음식점 (동네식당) Supabase 데이터베이스 마이그레이션 스크립트
-- ====================================================================

-- 1. restaurants 테이블 생성
CREATE TABLE IF NOT EXISTS public.restaurants (
    id TEXT PRIMARY KEY,                                      -- 고유 식별자 (bizesId)
    original_id TEXT NOT NULL,                                -- 공공데이터 원본 상가업소번호 (bizesId)
    data_source TEXT NOT NULL,                                -- 데이터 출처
    name TEXT NOT NULL,                                       -- 음식점 이름 (상호명)
    category TEXT NOT NULL,                                   -- 업종 대분류 (한식, 중식, 일식 등)
    sub_category TEXT,                                        -- 공공데이터 소분류명
    standard_industry_name TEXT,                              -- 표준산업분류명
    road_address TEXT NOT NULL,                               -- 도로명 주소
    jibun_address TEXT,                                       -- 지번 주소
    building_name TEXT,                                       -- 건물명
    floor TEXT,                                               -- 층정보
    dong_name TEXT,                                           -- 행정동명/법정동명
    phone TEXT,                                               -- 전화번호
    latitude DOUBLE PRECISION,                                -- 위도 (좌표 없는 데이터는 NULL 허용)
    longitude DOUBLE PRECISION,                               -- 경도 (좌표 없는 데이터는 NULL 허용)
    has_coordinates BOOLEAN NOT NULL DEFAULT true,            -- 유효 위경도 좌표 유무
    business_status TEXT,                                     -- 영업상태 (제공되는 데이터에만 저장)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- [요구사항] 출처와 원본 ID 조합으로 중복 저장 방지 (Unique Constraint)
    CONSTRAINT uq_restaurants_source_original UNIQUE (data_source, original_id)
);

-- 2. 검색 및 공간 반경 조회를 위한 고속 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_restaurants_coords ON public.restaurants(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_restaurants_category ON public.restaurants(category);
CREATE INDEX IF NOT EXISTS idx_restaurants_dong ON public.restaurants(dong_name);
CREATE INDEX IF NOT EXISTS idx_restaurants_updated ON public.restaurants(updated_at DESC);

-- 3. Row Level Security (RLS) 활성화
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- 기존 정책이 있다면 정리
DROP POLICY IF EXISTS "누구나 음식점 목록과 상세 조회 가능" ON public.restaurants;
DROP POLICY IF EXISTS "서비스 롤 전체 권한" ON public.restaurants;
DROP POLICY IF EXISTS "서버 API 데이터 삽입 및 갱신 허용" ON public.restaurants;
DROP POLICY IF EXISTS "서버 API 데이터 업데이트 허용" ON public.restaurants;
DROP POLICY IF EXISTS "Allow public read access to restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Allow public insert to restaurants" ON public.restaurants;

-- [요구사항] 1) 조회 RLS: 누구나 음식점 목록과 상세 화면을 자유롭게 조회 가능 (SELECT)
CREATE POLICY "누구나 음식점 목록과 상세 조회 가능"
    ON public.restaurants
    FOR SELECT
    USING (true);

-- [요구사항] 2) 쓰기 RLS: service_role 키를 통한 전체 접근 보장
CREATE POLICY "서비스 롤 전체 권한"
    ON public.restaurants
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- [요구사항] 3) 서버 API 경유 데이터 수집 및 갱신(Upsert) 허용
CREATE POLICY "서버 API 데이터 삽입 및 갱신 허용"
    ON public.restaurants
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "서버 API 데이터 업데이트 허용"
    ON public.restaurants
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
