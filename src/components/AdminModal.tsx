'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  X,
  Shield,
  AlertTriangle,
  EyeOff,
  Trash2,
  Check,
  RefreshCw,
  Loader2,
  Image as ImageIcon,
  Users,
  UserCheck,
  UserX,
  Key,
  History,
  Search,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Report, UserProfile, RoleDelegation } from '@/types/features';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminModal({ isOpen, onClose }: AdminModalProps) {
  const { user, profile, isAdmin, refreshProfile } = useAuth();

  // 상위 메인 탭: 'reports'(신고 및 리뷰 관리) | 'roles'(관리자 권한 위임 관리)
  const [mainTab, setMainTab] = useState<'reports' | 'roles'>('reports');

  // 1. 신고 관리 상태
  const [reports, setReports] = useState<Report[]>([]);
  const [filterStatus, setFilterStatus] = useState<'pending' | 'all'>('pending');
  const [isLoadingReports, setIsLoadingReports] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // 2. 권한 위임 관리 상태
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [delegations, setDelegations] = useState<RoleDelegation[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);
  const [roleActionUserId, setRoleActionUserId] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');

  // 3. 관리자 마스터 권한 획득 상태
  const [passkeyInput, setPasskeyInput] = useState<string>('');
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);

  // 신고 목록 조회
  const fetchReports = useCallback(async () => {
    setIsLoadingReports(true);
    try {
      const res = await fetch(`/api/reports?status=${filterStatus}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.reports)) {
        setReports(json.reports);
      }
    } catch (e) {
      console.error('Failed to fetch admin reports:', e);
    } finally {
      setIsLoadingReports(false);
    }
  }, [filterStatus]);

  // 전체 회원 및 권한 이양 이력 조회
  const fetchUsersAndRoles = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/roles');
      const json = await res.json();
      if (json.success) {
        if (Array.isArray(json.users)) setUsersList(json.users);
        if (Array.isArray(json.delegations)) setDelegations(json.delegations);
      }
    } catch (e) {
      console.error('Failed to fetch users and roles:', e);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (mainTab === 'reports') {
        fetchReports();
      } else {
        fetchUsersAndRoles();
      }
    }
  }, [isOpen, mainTab, fetchReports, fetchUsersAndRoles]);

  if (!isOpen) return null;

  // 신고 조치 실행 (블라인드 / 삭제 / 기각)
  const handleAction = async (reportId: string, action: 'blind' | 'delete' | 'reject') => {
    if (!user) return;
    setActionLoadingId(reportId);

    try {
      const res = await fetch('/api/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          action,
          adminUserId: user.id,
        }),
      });

      const json = await res.json();
      if (json.success) {
        await fetchReports();
      } else {
        alert(json.message || '조치에 실패했습니다.');
      }
    } catch (e) {
      console.error('Moderation action failed:', e);
      alert('오류가 발생했습니다.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 회원 권한 위임(승격) 또는 회수
  const handleToggleRole = async (targetUser: UserProfile) => {
    const isTargetAdmin = targetUser.role === 'admin';
    const newRole = isTargetAdmin ? 'user' : 'admin';
    const actionText = isTargetAdmin ? '관리자 권한을 회수' : '운영 관리자 권한을 위임';

    if (!confirm(`'${targetUser.nickname}' 님에게 ${actionText}하시겠습니까?`)) {
      return;
    }

    setRoleActionUserId(targetUser.id);
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: targetUser.id,
          newRole,
          adminUserId: user?.id,
          adminNickname: profile?.nickname || '관리자',
          reason: `${actionText} 처리`,
        }),
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message);
        await fetchUsersAndRoles();
        if (targetUser.id === user?.id) {
          await refreshProfile();
        }
      } else {
        alert(json.message || '권한 변경에 실패했습니다.');
      }
    } catch (err) {
      console.error('Toggle role failed:', err);
      alert('오류가 발생했습니다.');
    } finally {
      setRoleActionUserId(null);
    }
  };

  // 마스터 코드로 관리자 권한 즉시 활성화
  const handleClaimAdmin = async () => {
    if (!user) return;
    setIsClaiming(true);
    setClaimMessage(null);
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          passkey: passkeyInput.trim() || 'taste2026',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setClaimMessage('🎉 운영 관리자 권한이 성공적으로 활성화되었습니다!');
        await refreshProfile();
        await fetchReports();
        await fetchUsersAndRoles();
      } else {
        setClaimMessage(`❌ ${json.message || '인증에 실패했습니다.'}`);
      }
    } catch (err) {
      console.error('Claim admin error:', err);
      setClaimMessage('권한 활성화 중 오류가 발생했습니다.');
    } finally {
      setIsClaiming(false);
    }
  };

  const filteredUsers = usersList.filter((u) => {
    if (!userSearchQuery.trim()) return true;
    const q = userSearchQuery.trim().toLowerCase();
    return u.nickname.toLowerCase().includes(q) || u.id.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[88vh] overflow-hidden border border-gray-100 flex flex-col scale-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-bold">운영 관리자 센터</h2>
                <span
                  className={`text-[10px] px-2 py-0.5 font-bold rounded-full ${
                    isAdmin
                      ? 'bg-amber-400/20 text-amber-300'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {isAdmin ? 'Admin' : 'Guest'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                신고된 리뷰 조치 및 회원 관리자 권한 위임 관리
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 최상위 탭: 신고 관리 vs 권한 이양 관리 */}
        <div className="flex border-b border-gray-200 bg-gray-100/80 px-4 pt-2 gap-2 shrink-0">
          <button
            onClick={() => setMainTab('reports')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 ${
              mainTab === 'reports'
                ? 'bg-white text-gray-900 shadow-xs border-t-2 border-emerald-600'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-600" />
            <span>신고 접수 및 리뷰 관리</span>
          </button>

          <button
            onClick={() => setMainTab('roles')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 ${
              mainTab === 'roles'
                ? 'bg-white text-gray-900 shadow-xs border-t-2 border-emerald-600'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span>관리자 권한 위임·관리</span>
          </button>
        </div>

        {/* 서브 바: 새로고침 & 서브 필터 */}
        <div className="p-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
          {mainTab === 'reports' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterStatus === 'pending'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                대기 중 신고
              </button>
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterStatus === 'all'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                전체 내역
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="닉네임 검색..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          <button
            onClick={mainTab === 'reports' ? fetchReports : fetchUsersAndRoles}
            disabled={isLoadingReports || isLoadingUsers}
            className="p-1.5 text-gray-500 hover:text-gray-800 bg-white border border-gray-200 rounded-xl transition-all flex items-center gap-1 text-xs"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isLoadingReports || isLoadingUsers ? 'animate-spin' : ''
              }`}
            />
            <span className="hidden sm:inline">새로고침</span>
          </button>
        </div>

        {/* 본문 컨텐츠 */}
        <div className="p-4 overflow-y-auto space-y-3.5 flex-1 bg-slate-50/50">
          {/* 미인증 사용자용 관리자 권한 획득 배너 */}
          {!isAdmin && (
            <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl text-xs space-y-2.5 shadow-xs">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-900">
                    현재 계정({profile?.nickname || '회원'})에 관리자 권한이 부여되지 않았습니다.
                  </p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    관리자 마스터 인증 코드 입력 또는 버튼 클릭으로 즉시 최고 관리자 권한을 획득할 수 있습니다.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <div className="relative flex-1">
                  <Key className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    placeholder="마스터 인증 코드 (기본: taste2026)"
                    value={passkeyInput}
                    onChange={(e) => setPasskeyInput(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <button
                  onClick={handleClaimAdmin}
                  disabled={isClaiming}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 flex items-center gap-1"
                >
                  {isClaiming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                  <span>관리자 권한 즉시 획득</span>
                </button>
              </div>

              {claimMessage && (
                <div className="text-[11px] font-bold text-amber-900 bg-amber-100/70 p-1.5 rounded-lg">
                  {claimMessage}
                </div>
              )}
            </div>
          )}

          {/* 1. 신고 관리 탭 */}
          {mainTab === 'reports' && (
            <>
              {isLoadingReports ? (
                <div className="py-16 text-center text-gray-400 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
                  <p className="text-xs">신고 내역을 불러오고 있습니다...</p>
                </div>
              ) : reports.length === 0 ? (
                <div className="py-16 text-center text-gray-400 space-y-1">
                  <Check className="w-8 h-8 mx-auto text-emerald-500 mb-1" />
                  <p className="text-xs font-bold text-gray-700">접수된 신고 내역이 없습니다.</p>
                  <p className="text-[11px]">동네 맛집 커뮤니티가 깨끗하게 유지되고 있습니다.</p>
                </div>
              ) : (
                reports.map((report) => {
                  const review = report.review;
                  const isActionLoading = actionLoadingId === report.id;

                  return (
                    <div
                      key={report.id}
                      className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              report.status === 'pending'
                                ? 'bg-red-100 text-red-700'
                                : report.status === 'resolved_blind'
                                ? 'bg-gray-100 text-gray-600'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {report.status === 'pending'
                              ? '조치 대기중'
                              : report.status === 'resolved_blind'
                              ? '블라인드/삭제 완료'
                              : '신고 기각(정상)'}
                          </span>
                          <span className="text-xs font-bold text-red-600">
                            {report.reason}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {new Date(report.createdAt).toLocaleString('ko-KR')}
                        </span>
                      </div>

                      {report.detail && (
                        <div className="text-xs text-gray-600 bg-red-50/50 p-2 rounded-xl border border-red-100">
                          <span className="font-bold text-red-800">신고자 상세 내용:</span> {report.detail}
                        </div>
                      )}

                      {/* 신고 대상 리뷰 카드 */}
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-gray-500 text-[11px]">
                          <span>
                            작성자: <strong className="text-gray-800">{review?.userNickname || '알 수 없음'}</strong>
                          </span>
                          <span>별점: ⭐ {review?.rating || '-'}점</span>
                        </div>

                        <p className="text-gray-900 font-medium">
                          {review?.content || '(리뷰 본문 정보가 없거나 이미 삭제됨)'}
                        </p>

                        {/* 사진 미리보기 */}
                        {review?.photoUrls && review.photoUrls.length > 0 && (
                          <div className="flex items-center gap-2 pt-1 overflow-x-auto">
                            {review.photoUrls.map((url: string, idx: number) => (
                              <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-14 h-14 rounded-lg overflow-hidden border border-gray-200 shrink-0 relative block group"
                              >
                                <img
                                  src={url}
                                  alt="리뷰 사진"
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                  <ImageIcon className="w-3.5 h-3.5" />
                                </div>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 조치 버튼 바 (대기 상태일 때만 노출) */}
                      {report.status === 'pending' && (
                        <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                          <button
                            onClick={() => handleAction(report.id, 'blind')}
                            disabled={isActionLoading || !isAdmin}
                            className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                          >
                            <EyeOff className="w-3.5 h-3.5 text-gray-600" />
                            <span>블라인드 (숨김)</span>
                          </button>

                          <button
                            onClick={() => handleAction(report.id, 'delete')}
                            disabled={isActionLoading || !isAdmin}
                            className="flex-1 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                            <span>영구 삭제</span>
                          </button>

                          <button
                            onClick={() => handleAction(report.id, 'reject')}
                            disabled={isActionLoading || !isAdmin}
                            className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>신고 기각 (정상)</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* 2. 관리자 권한 위임 및 관리 탭 */}
          {mainTab === 'roles' && (
            <div className="space-y-4">
              {/* 회원 목록 & 권한 변경 테이블 */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                <div className="p-3.5 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-bold text-gray-900">전체 회원 및 관리자 권한 목록</h3>
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">
                      총 {filteredUsers.length}명
                    </span>
                  </div>
                </div>

                {isLoadingUsers ? (
                  <div className="py-12 text-center text-gray-400 space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
                    <p className="text-xs">회원 목록을 불러오는 중...</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 text-xs">
                    검색된 회원이 없습니다.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredUsers.map((u) => {
                      const isUserAdmin = u.role === 'admin';
                      const isMe = u.id === user?.id;
                      const isActionLoading = roleActionUserId === u.id;

                      return (
                        <div
                          key={u.id}
                          className="p-3.5 flex items-center justify-between gap-3 hover:bg-gray-50/70 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                isUserAdmin
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {u.nickname.slice(0, 1)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-gray-900 truncate">
                                  {u.nickname}
                                </span>
                                {isMe && (
                                  <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded-full font-bold">
                                    나
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400 truncate">
                                가입일: {new Date(u.createdAt).toLocaleDateString('ko-KR')}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                                isUserAdmin
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {isUserAdmin ? '운영 관리자' : '일반 회원'}
                            </span>

                            {/* 권한 위임/회수 버튼 (관리자만 수행 가능) */}
                            <button
                              onClick={() => handleToggleRole(u)}
                              disabled={isActionLoading || (!isAdmin && !isMe)}
                              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 ${
                                isUserAdmin
                                  ? 'bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600'
                                  : 'bg-amber-500 hover:bg-amber-600 text-white'
                              } disabled:opacity-50`}
                            >
                              {isActionLoading ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : isUserAdmin ? (
                                <UserX className="w-3 h-3" />
                              ) : (
                                <UserCheck className="w-3 h-3" />
                              )}
                              <span>{isUserAdmin ? '권한 회수' : '관리자 위임'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 권한 이양 및 변경 이력 로그 타임라인 */}
              <div className="bg-white rounded-2xl border border-gray-200 p-3.5 shadow-xs space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                  <History className="w-4 h-4 text-gray-500" />
                  <span>권한 이양 및 위임 이력 로그</span>
                </div>

                {delegations.length === 0 ? (
                  <p className="text-[11px] text-gray-400 py-3 text-center">
                    아직 기록된 권한 위임 이력이 없습니다.
                  </p>
                ) : (
                  <div className="space-y-1.5 text-xs">
                    {delegations.map((d) => (
                      <div
                        key={d.id}
                        className="p-2.5 bg-gray-50 rounded-xl flex items-center justify-between text-gray-700"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                              d.grantedRole === 'admin'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {d.grantedRole === 'admin' ? '위임' : '회수'}
                          </span>
                          <span>
                            <strong>{d.targetNickname}</strong> 님에게{' '}
                            <strong>{d.grantedRole === 'admin' ? '관리자' : '일반'}</strong> 권한 부여
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {new Date(d.createdAt).toLocaleString('ko-KR')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
