# 동네식당 (Taste) - 우리 동네 음식점 찾기

반응형 웹 기반의 내 주변 음식점 탐색 및 지도 서비스입니다.  
공공데이터포털(소상공인시장진흥공단)의 실제 상가 정보를 서버에서 실시간 수집 및 동기화하며, Supabase PostGIS 공간 데이터베이스를 기반으로 정확한 직선거리 계산과 반경 검색을 제공합니다.

---

## 🌟 주요 기능

1. **내 주변 찾기 (GPS & 동네 선택)**:
   - 사용자가 명시적으로 버튼을 누를 때만 브라우저 위치 권한을 요청합니다.
   - 위치 권한 거부, 시간 초과, 미지원 환경 발생 시 친절한 안내와 함께 **지역(동네) 직접 선택 모달**을 제공합니다.
   - **사용자 위치 정보는 DB에 일체 저장하지 않으며**, 오직 브라우저 메모리에서만 실시간 계산용으로 안전하게 사용됩니다.

2. **반경 500m / 1km / 3km 공간 검색 (PostGIS)**:
   - Supabase PostGIS `ST_DWithin`과 `GEOGRAPHY(Point, 4326)` 공간 인덱스를 활용하여 반경 안의 음식점만 정확하게 필터링합니다.
   - DB에서 계산된 구면 직선거리를 기준으로 **가까운 순서(오름차순)로 정렬**합니다.

3. **실시간 공공데이터 연동 및 DB 캐싱**:
   - 소상공인시장진흥공단 상가(상권)정보 API(`storeListInRadius`)를 서버에서만 호출하여 보안을 유지합니다.
   - 출처(`data_source`)와 원본 ID(`original_id`)의 복합 유니크 제약조건을 통해 중복 저장을 방지하고, 재수집 시 기존 데이터를 최신 정보로 갱신(Upsert)합니다.

4. **정직한 데이터 표기 원칙**:
   - 공공데이터 규격상 제공되지 않는 평점, 리뷰 수, 가짜 사진, 상세 영업시간을 인위적으로 생성하지 않으며, 데이터 출처와 원본 명세를 상세 화면에 투명하게 보존합니다.

5. **목록 & 카카오 지도 동기화**:
   - 동일한 검색 결과 배열을 목록과 카카오 지도에 실시간 동기화합니다.
   - 카카오 지도 SDK 오류 또는 도메인 미등록 시 대화형 프로토타입 지도로 자연스럽게 Fallback됩니다.

---

## 🛠 기술 스택

- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS, Lucide React
- **Backend / Database**: Next.js Route Handlers, Supabase (PostgreSQL + PostGIS)
- **Map SDK**: 카카오 지도 (Kakao Maps JavaScript SDK)
- **Data Source**: 공공데이터포털 (소상공인시장진흥공단 상가(상권)정보 API)

---

## 🚀 시작하기

### 1. 패키지 설치
```bash
npm install
```

### 2. 환경변수 설정
`.env.example`을 참고하여 `.env.local` 파일을 생성합니다.

```env
# 카카오 지도 JavaScript API Key
NEXT_PUBLIC_KAKAO_MAP_KEY=your_kakao_javascript_key

# Supabase 연동 정보
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key # 선택 사항

# 공공데이터포털 서비스 키 (서버 전용)
DATA_GO_KR_API_KEY=your_data_go_kr_service_key
```

### 3. Supabase 데이터베이스 마이그레이션
Supabase 대시보드의 **SQL Editor**에서 `supabase-schema.sql` 내용을 붙여넣고 실행합니다.
- PostGIS 확장 활성화 (`CREATE EXTENSION IF NOT EXISTS postgis;`)
- `restaurants` 테이블 및 공간 컬럼(`geom`), GIST 공간 인덱스 생성
- 주변 반경 검색 및 직선거리 정렬 RPC 함수(`search_restaurants_nearby`) 등록

### 4. 로컬 개발 서버 실행
```bash
npm run dev
```
브라우저에서 `http://localhost:3000`으로 접속합니다.
