import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

// GET: 신고 목록 조회 (관리자용)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;

    let query = supabaseServer
      .from('reports')
      .select('*, review:reviews(*)')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mappedReports = (data || []).map((rpt: any) => ({
      id: rpt.id,
      reviewId: rpt.review_id,
      reporterId: rpt.reporter_id,
      reporterNickname: rpt.reporter_nickname,
      reason: rpt.reason,
      detail: rpt.detail,
      status: rpt.status,
      createdAt: rpt.created_at,
      resolvedAt: rpt.resolved_at,
      resolvedBy: rpt.resolved_by,
      review: rpt.review
        ? {
            id: rpt.review.id,
            restaurantId: rpt.review.restaurant_id,
            userId: rpt.review.user_id,
            userNickname: rpt.review.user_nickname,
            rating: rpt.review.rating,
            content: rpt.review.content,
            photoUrls: rpt.review.photo_urls || [],
            status: rpt.review.status,
            createdAt: rpt.review.created_at,
            updatedAt: rpt.review.updated_at,
          }
        : undefined,
    }));

    return NextResponse.json({
      success: true,
      reports: mappedReports,
    });
  } catch (err: unknown) {
    console.error('Reports GET error:', err);
    return NextResponse.json(
      {
        success: false,
        message: '신고 목록을 조회하지 못했습니다.',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

// POST: 리뷰 신고 접수
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reviewId, reporterId, reporterNickname, reason, detail } = body;

    if (!reviewId || !reporterId || !reason) {
      return NextResponse.json(
        { success: false, message: '필수 신고 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 이미 같은 사용자가 동일 리뷰를 신고했는지 확인
    const { data: existingReport } = await supabaseServer
      .from('reports')
      .select('id')
      .eq('review_id', reviewId)
      .eq('reporter_id', reporterId)
      .single();

    if (existingReport) {
      return NextResponse.json(
        { success: false, message: '이미 신고 접수된 리뷰입니다.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServer
      .from('reports')
      .insert({
        review_id: reviewId,
        reporter_id: reporterId,
        reporter_nickname: reporterNickname || '익명 이용자',
        reason: reason.trim(),
        detail: detail ? detail.trim() : null,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: '신고가 정상적으로 접수되었습니다. 관리자 검토 후 조치됩니다.',
      report: data,
    });
  } catch (err: unknown) {
    console.error('Reports POST error:', err);
    return NextResponse.json(
      {
        success: false,
        message: '신고를 접수하지 못했습니다.',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

// PATCH: 신고 처리 (관리자 권한: 블라인드/숨김 처리, 기각 처리)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { reportId, action, adminUserId } = body; // action: 'blind' | 'reject' | 'delete'

    if (!reportId || !action || !adminUserId) {
      return NextResponse.json(
        { success: false, message: '필수 처리 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 신고 대상 정보 조회
    const { data: report, error: reportErr } = await supabaseServer
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (reportErr || !report) {
      return NextResponse.json(
        { success: false, message: '해당 신고 건을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    if (action === 'blind') {
      // 1. 해당 리뷰를 'hidden'(블라인드)으로 변경
      await supabaseServer
        .from('reviews')
        .update({ status: 'hidden', updated_at: now })
        .eq('id', report.review_id);

      // 2. 신고 상태를 'resolved_blind'로 변경
      await supabaseServer
        .from('reports')
        .update({
          status: 'resolved_blind',
          resolved_at: now,
          resolved_by: adminUserId,
        })
        .eq('id', reportId);

      return NextResponse.json({
        success: true,
        message: '리뷰가 블라인드(숨김) 처리되었습니다.',
      });
    }

    if (action === 'delete') {
      // 1. 해당 리뷰 영구 삭제
      await supabaseServer
        .from('reviews')
        .delete()
        .eq('id', report.review_id);

      // 2. 신고 상태 업데이트
      await supabaseServer
        .from('reports')
        .update({
          status: 'resolved_blind',
          resolved_at: now,
          resolved_by: adminUserId,
        })
        .eq('id', reportId);

      return NextResponse.json({
        success: true,
        message: '신고된 리뷰가 영구 삭제되었습니다.',
      });
    }

    if (action === 'reject') {
      // 신고 기각
      await supabaseServer
        .from('reports')
        .update({
          status: 'rejected',
          resolved_at: now,
          resolved_by: adminUserId,
        })
        .eq('id', reportId);

      return NextResponse.json({
        success: true,
        message: '신고가 기각(정상 유지) 처리되었습니다.',
      });
    }

    return NextResponse.json(
      { success: false, message: '지원하지 않는 조치입니다.' },
      { status: 400 }
    );
  } catch (err: unknown) {
    console.error('Reports PATCH error:', err);
    return NextResponse.json(
      {
        success: false,
        message: '신고 조치 중 오류가 발생했습니다.',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
