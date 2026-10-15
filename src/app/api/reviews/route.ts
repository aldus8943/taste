import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

// GET: 식당별 리뷰 및 평점 통계 조회
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get('restaurantId');

  if (!restaurantId) {
    return NextResponse.json(
      { success: false, message: 'restaurantId 파라미터가 필요합니다.' },
      { status: 400 }
    );
  }

  try {
    // 1. 공개(published) 상태인 리뷰 목록 조회
    const { data: reviews, error: reviewError } = await supabaseServer
      .from('reviews')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (reviewError) {
      console.warn('Reviews fetch warning:', reviewError);
    }

    const reviewList = reviews || [];
    const totalReviews = reviewList.length;
    const averageRating =
      totalReviews > 0
        ? parseFloat(
            (
              reviewList.reduce((acc, r) => acc + (r.rating || 0), 0) /
              totalReviews
            ).toFixed(1)
          )
        : 0;

    return NextResponse.json({
      success: true,
      reviews: reviewList.map((r) => ({
        id: r.id,
        restaurantId: r.restaurant_id,
        userId: r.user_id,
        userNickname: r.user_nickname,
        rating: r.rating,
        content: r.content,
        photoUrls: r.photo_urls || [],
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
      stats: {
        averageRating,
        totalReviews,
      },
    });
  } catch (err: unknown) {
    console.error('Reviews GET error:', err);
    return NextResponse.json(
      {
        success: false,
        message: '리뷰를 조회하는 도중 오류가 발생했습니다.',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

// POST: 신규 리뷰 작성 (별점, 내용, 사진 첨부)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { restaurantId, userId, userNickname, rating, content, photoUrls } = body;

    if (!restaurantId || !userId || !content || !rating) {
      return NextResponse.json(
        { success: false, message: '필수 리뷰 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    const numericRating = Math.max(1, Math.min(5, parseInt(rating, 10)));

    const { data, error } = await supabaseServer
      .from('reviews')
      .insert({
        restaurant_id: restaurantId,
        user_id: userId,
        user_nickname: userNickname || '익명 미식가',
        rating: numericRating,
        content: content.trim(),
        photo_urls: Array.isArray(photoUrls) ? photoUrls : [],
        status: 'published',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Reviews Supabase insert error:', error);
      let errorMsg = '리뷰를 등록하지 못했습니다.';
      if (
        error.code === 'PGRST205' ||
        error.message?.includes('Could not find the table') ||
        error.message?.includes('relation "public.reviews" does not exist')
      ) {
        errorMsg =
          '데이터베이스에 reviews 테이블이 생성되지 않았습니다. 안내해 드린 SQL을 Supabase SQL Editor에서 실행해 주세요.';
      } else if (error.message) {
        errorMsg = `리뷰 등록 실패: ${error.message}`;
      }

      return NextResponse.json(
        {
          success: false,
          message: errorMsg,
          detail: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      review: {
        id: data.id,
        restaurantId: data.restaurant_id,
        userId: data.user_id,
        userNickname: data.user_nickname,
        rating: data.rating,
        content: data.content,
        photoUrls: data.photo_urls || [],
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    });
  } catch (err: unknown) {
    console.error('Reviews POST error:', err);
    const errObj = err as { code?: string; message?: string };
    let errorMsg = '리뷰를 등록하지 못했습니다.';
    if (
      errObj?.code === 'PGRST205' ||
      errObj?.message?.includes('Could not find the table')
    ) {
      errorMsg =
        '데이터베이스에 reviews 테이블이 생성되지 않았습니다. 안내해 드린 SQL을 Supabase SQL Editor에서 실행해 주세요.';
    } else if (err instanceof Error) {
      errorMsg = `리뷰 등록 실패: ${err.message}`;
    }

    return NextResponse.json(
      {
        success: false,
        message: errorMsg,
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

// DELETE: 리뷰 삭제 (작성자 또는 관리자)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reviewId = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!reviewId || !userId) {
      return NextResponse.json(
        { success: false, message: 'reviewId와 userId가 필요합니다.' },
        { status: 400 }
      );
    }

    // 작성자 확인 또는 관리자 권한 확인
    const { data: profile } = await supabaseServer
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    const isAdmin = profile?.role === 'admin';

    const query = supabaseServer.from('reviews').delete().eq('id', reviewId);
    if (!isAdmin) {
      query.eq('user_id', userId);
    }

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: '리뷰가 성공적으로 삭제되었습니다.',
    });
  } catch (err: unknown) {
    console.error('Reviews DELETE error:', err);
    return NextResponse.json(
      {
        success: false,
        message: '리뷰를 삭제하지 못했습니다.',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
