import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

// GET: 사용자의 즐겨찾기 음식점 전체 목록 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'userId가 필요합니다.' },
        { status: 400 }
      );
    }

    const { data: favorites, error } = await supabaseServer
      .from('favorites')
      .select('restaurant_id, created_at, restaurant:restaurants(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const restaurants = (favorites || []).map((f: any) => {
      const r = f.restaurant;
      if (!r) return null;
      return {
        id: r.id,
        originalId: r.original_id,
        name: r.name,
        category: r.category,
        subCategory: r.sub_category,
        standardIndustryName: r.standard_industry_name,
        roadAddress: r.road_address,
        jibunAddress: r.jibun_address || '',
        buildingName: r.building_name,
        floor: r.floor,
        dongName: r.dong_name,
        phone: r.phone || '안내전화 미제공',
        latitude: r.latitude,
        longitude: r.longitude,
        hasCoordinates: r.has_coordinates,
        permitDate: r.created_at ? new Date(r.created_at).toLocaleDateString('ko-KR') : '등록',
        businessStatus: r.business_status || '영업/정상',
        isSample: false,
        dataSource: r.data_source,
        favoritedAt: f.created_at,
      };
    }).filter(Boolean);

    return NextResponse.json({
      success: true,
      favorites: restaurants,
    });
  } catch (err: unknown) {
    console.error('Favorites GET error:', err);
    return NextResponse.json(
      {
        success: false,
        message: '즐겨찾기 목록을 조회하지 못했습니다.',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
