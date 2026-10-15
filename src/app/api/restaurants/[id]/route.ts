import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { Restaurant, RestaurantCategory } from '@/types/restaurant';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbRowToRestaurant(row: any): Restaurant {
  return {
    id: row.id,
    originalId: row.original_id,
    name: row.name,
    category: row.category as RestaurantCategory,
    subCategory: row.sub_category || undefined,
    standardIndustryName: row.standard_industry_name || undefined,
    roadAddress: row.road_address,
    jibunAddress: row.jibun_address || '',
    buildingName: row.building_name || undefined,
    floor: row.floor || undefined,
    dongName: row.dong_name || undefined,
    phone: row.phone || '안내전화 미제공',
    latitude: row.latitude,
    longitude: row.longitude,
    hasCoordinates: Boolean(row.has_coordinates && row.latitude && row.longitude),
    permitDate: row.created_at ? new Date(row.created_at).toLocaleDateString('ko-KR') : '공공데이터 등록',
    businessStatus: (row.business_status as '영업/정상') || '영업/정상',
    isSample: false,
    dataSource: row.data_source,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { success: false, message: '음식점 ID가 지정되지 않았습니다.' },
      { status: 400 }
    );
  }

  try {
    // Supabase DB에서 식당 단건 조회
    const { data, error } = await supabaseServer
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        { success: false, message: '데이터베이스에서 음식점을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const restaurant = mapDbRowToRestaurant(data);

    return NextResponse.json({
      success: true,
      data: restaurant,
      source: 'Supabase DB',
    });
  } catch (err: unknown) {
    console.error('Error fetching restaurant detail by ID:', err);
    return NextResponse.json(
      {
        success: false,
        message: '음식점 상세 정보를 불러오지 못했습니다.',
        detail: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
