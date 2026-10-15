import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

// GET: 전체 회원 프로필 목록 및 권한 이양 이력 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // 1. 전체 프로필 목록 조회
    const { data: profiles, error: profileErr } = await supabaseServer
      .from('profiles')
      .select('id, nickname, avatar_url, role, created_at')
      .order('created_at', { ascending: false });

    if (profileErr) throw profileErr;

    // 2. 권한 이양 이력 조회 (테이블 존재 시)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let delegations: any[] = [];
    try {
      const { data: delegData, error: delegErr } = await supabaseServer
        .from('role_delegations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      if (!delegErr && delegData) {
        delegations = delegData.map((d: any) => ({
          id: d.id,
          targetUserId: d.target_user_id,
          targetNickname: d.target_nickname,
          grantedBy: d.granted_by,
          grantedByNickname: d.granted_by_nickname,
          grantedRole: d.granted_role,
          reason: d.reason,
          createdAt: d.created_at,
        }));
      }
    } catch {
      // role_delegations 테이블이 아직 없는 경우 무시
    }

    return NextResponse.json({
      success: true,
      users: (profiles || []).map((p: any) => ({
        id: p.id,
        nickname: p.nickname,
        avatarUrl: p.avatar_url,
        role: p.role || 'user',
        createdAt: p.created_at,
      })),
      delegations,
    });
  } catch (err: unknown) {
    console.error('Admin roles GET error:', err);
    return NextResponse.json(
      {
        success: false,
        message: '회원 목록을 조회하지 못했습니다.',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

// POST: 특정 회원의 관리자 권한 위임(승격) 또는 회수
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { targetUserId, newRole, adminUserId, adminNickname, reason } = body;

    if (!targetUserId || !newRole) {
      return NextResponse.json(
        { success: false, message: '필수 대상 회원 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    if (newRole !== 'admin' && newRole !== 'user') {
      return NextResponse.json(
        { success: false, message: '유효하지 않은 역할입니다.' },
        { status: 400 }
      );
    }

    // 1. 대상 회원의 닉네임 확인
    const { data: targetProfile, error: fetchErr } = await supabaseServer
      .from('profiles')
      .select('nickname')
      .eq('id', targetUserId)
      .single();

    if (fetchErr || !targetProfile) {
      return NextResponse.json(
        { success: false, message: '대상 회원을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 2. 대상 회원의 role 업데이트
    const { error: updateErr } = await supabaseServer
      .from('profiles')
      .update({ role: newRole })
      .eq('id', targetUserId);

    if (updateErr) throw updateErr;

    // 3. 이력 테이블(role_delegations)에 기록 (실패하더라도 권한 변경은 유지)
    try {
      await supabaseServer.from('role_delegations').insert({
        target_user_id: targetUserId,
        target_nickname: targetProfile.nickname,
        granted_by: adminUserId || null,
        granted_by_nickname: adminNickname || '시스템 관리자',
        granted_role: newRole,
        reason: reason || (newRole === 'admin' ? '운영 관리자 권한 위임' : '관리자 권한 회수'),
        created_at: new Date().toISOString(),
      });
    } catch (delegErr) {
      console.warn('role_delegations insert warning:', delegErr);
    }

    return NextResponse.json({
      success: true,
      message: `'${targetProfile.nickname}' 님의 권한이 [${
        newRole === 'admin' ? '운영 관리자' : '일반 회원'
      }](으)로 변경되었습니다.`,
    });
  } catch (err: unknown) {
    console.error('Admin roles POST error:', err);
    return NextResponse.json(
      {
        success: false,
        message: '권한 변경 처리에 실패했습니다.',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

// PUT: 마스터 패스키로 최초 관리자 권한 획득 (UI에서 1클릭 복구 지원)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { userId, passkey } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'userId가 필요합니다.' },
        { status: 400 }
      );
    }

    // 기존 admin이 존재하는지 확인
    const { data: existingAdmins } = await supabaseServer
      .from('profiles')
      .select('id')
      .eq('role', 'admin');

    const hasAdmins = existingAdmins && existingAdmins.length > 0;

    // 관리자가 이미 존재하는 경우 패스키 필수 확인 ('taste2026')
    if (hasAdmins && passkey !== 'taste2026') {
      return NextResponse.json(
        { success: false, message: '관리자 마스터 인증 코드가 일치하지 않습니다.' },
        { status: 403 }
      );
    }

    // role을 admin으로 업데이트
    const { data: updated, error: updateErr } = await supabaseServer
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', userId)
      .select('nickname')
      .single();

    if (updateErr) throw updateErr;

    // 이력 기록
    try {
      await supabaseServer.from('role_delegations').insert({
        target_user_id: userId,
        target_nickname: updated?.nickname || '회원',
        granted_by: userId,
        granted_by_nickname: '최초 마스터 등록',
        granted_role: 'admin',
        reason: '관리자 마스터 인증을 통한 최초 권한 활성화',
        created_at: new Date().toISOString(),
      });
    } catch {
      // 무시
    }

    return NextResponse.json({
      success: true,
      message: '운영 관리자 권한이 성공적으로 활성화되었습니다.',
    });
  } catch (err: unknown) {
    console.error('Admin claim PUT error:', err);
    return NextResponse.json(
      {
        success: false,
        message: '관리자 권한 활성화에 실패했습니다.',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
