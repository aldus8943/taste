-- ====================================================================
-- 우리 동네 음식점 (동네식당) PostGIS 공간 검색 및 거리 정렬 마이그레이션
-- ====================================================================

-- 1. PostGIS 확장 활성화
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. restaurants 테이블 생성 (없으면 생성)
CREATE TABLE IF NOT EXISTS public.restaurants (
    id TEXT PRIMARY KEY,
    original_id TEXT NOT NULL,
    data_source TEXT NOT NULL,
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

-- 3. PostGIS 지리 공간 컬럼 (geom: GEOGRAPHY Point, WGS 84 SRID 4326) 추가
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'restaurants' 
        AND column_name = 'geom'
    ) THEN
        ALTER TABLE public.restaurants ADD COLUMN geom GEOGRAPHY(Point, 4326);
    END IF;
END $$;

-- 4. 위경도 삽입/수정 시 자동으로 geom(경도 X, 위도 Y)을 계산하는 트리거
CREATE OR REPLACE FUNCTION public.update_restaurants_geom()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.longitude IS NOT NULL AND NEW.latitude IS NOT NULL THEN
        -- [주의] PostGIS ST_MakePoint는 (경도 longitude, 위도 latitude) 순서입니다.
        NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
        NEW.has_coordinates := true;
    ELSE
        NEW.geom := NULL;
        NEW.has_coordinates := false;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_restaurants_geom ON public.restaurants;
CREATE TRIGGER trg_update_restaurants_geom
BEFORE INSERT OR UPDATE OF latitude, longitude ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.update_restaurants_geom();

-- 기존 데이터 geom 일괄 갱신
UPDATE public.restaurants
SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE longitude IS NOT NULL AND latitude IS NOT NULL AND geom IS NULL;

-- 5. PostGIS 공간 인덱스(GIST) 생성
CREATE INDEX IF NOT EXISTS idx_restaurants_geom ON public.restaurants USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_restaurants_category ON public.restaurants(category);
CREATE INDEX IF NOT EXISTS idx_restaurants_name ON public.restaurants(name);

-- 6. Row Level Security (RLS) 활성화 및 정책
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "누구나 음식점 목록과 상세 조회 가능" ON public.restaurants;
DROP POLICY IF EXISTS "서비스 롤 전체 권한" ON public.restaurants;
DROP POLICY IF EXISTS "서버 API 데이터 삽입 및 갱신 허용" ON public.restaurants;
DROP POLICY IF EXISTS "서버 API 데이터 업데이트 허용" ON public.restaurants;

CREATE POLICY "누구나 음식점 목록과 상세 조회 가능"
    ON public.restaurants
    FOR SELECT
    USING (true);

CREATE POLICY "서비스 롤 전체 권한"
    ON public.restaurants
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

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

-- 7. [핵심 RPC 함수] PostGIS 공간 반경 검색 및 직선거리 정렬 함수
CREATE OR REPLACE FUNCTION public.search_restaurants_nearby(
    center_lat DOUBLE PRECISION,
    center_lon DOUBLE PRECISION,
    radius_meters INTEGER,
    category_filter TEXT DEFAULT NULL,
    search_query TEXT DEFAULT NULL,
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    id TEXT,
    original_id TEXT,
    data_source TEXT,
    name TEXT,
    category TEXT,
    sub_category TEXT,
    standard_industry_name TEXT,
    road_address TEXT,
    jibun_address TEXT,
    building_name TEXT,
    floor TEXT,
    dong_name TEXT,
    phone TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    has_coordinates BOOLEAN,
    business_status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    distance_meters DOUBLE PRECISION -- DB에서 계산된 정확한 직선거리 (단위: 미터)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    center_point GEOGRAPHY;
BEGIN
    -- [좌표 순서] PostGIS ST_MakePoint는 (경도 center_lon, 위도 center_lat) 순서입니다.
    center_point := ST_SetSRID(ST_MakePoint(center_lon, center_lat), 4326)::geography;

    RETURN QUERY
    SELECT
        r.id,
        r.original_id,
        r.data_source,
        r.name,
        r.category,
        r.sub_category,
        r.standard_industry_name,
        r.road_address,
        r.jibun_address,
        r.building_name,
        r.floor,
        r.dong_name,
        r.phone,
        r.latitude,
        r.longitude,
        r.has_coordinates,
        r.business_status,
        r.created_at,
        r.updated_at,
        -- [거리 계산] 구면 직선거리 계산 (단위: 미터)
        ROUND(ST_Distance(r.geom, center_point)::numeric, 1)::double precision AS distance_meters
    FROM public.restaurants r
    WHERE
        r.geom IS NOT NULL
        -- [반경 검색] 500m / 1km / 3km 반경 안의 음식점만 필터링 (반경 밖은 완벽히 제외)
        AND ST_DWithin(r.geom, center_point, radius_meters)
        -- [업종 필터]
        AND (category_filter IS NULL OR category_filter = '전체' OR r.category = category_filter)
        -- [이름/주소 검색]
        AND (
            search_query IS NULL
            OR TRIM(search_query) = ''
            OR r.name ILIKE '%' || TRIM(search_query) || '%'
            OR r.road_address ILIKE '%' || TRIM(search_query) || '%'
            OR r.sub_category ILIKE '%' || TRIM(search_query) || '%'
        )
    -- [거리 정렬] 가까운 순서(오름차순) 정렬
    ORDER BY distance_meters ASC
    -- [개수 제한]
    LIMIT limit_count;
END;
$$;
