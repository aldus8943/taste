'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { X, Shield, AlertTriangle, EyeOff, Trash2, Check, RefreshCw, Loader2, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Report } from '@/types/features';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminModal({ isOpen, onClose }: AdminModalProps) {
  const { user, isAdmin } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [filterStatus, setFilterStatus] = useState<'pending' | 'all'>('pending');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/reports?status=${filterStatus}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.reports)) {
        setReports(json.reports);
      }
    } catch (e) {
      console.error('Failed to fetch admin reports:', e);
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    if (isOpen) {
      fetchReports();
    }
  }, [isOpen, fetchReports]);

  if (!isOpen) return null;

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
        // 새로고침
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden border border-gray-100 flex flex-col scale-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-bold">운영 관리자 센터</h2>
                <span className="text-[10px] px-2 py-0.5 bg-amber-400/20 text-amber-300 font-bold rounded-full">
                  Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-400">신고 접수된 부적절 리뷰 및 사진 검토·조치</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 탭 & 필터 */}
        <div className="p-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
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

          <button
            onClick={fetchReports}
            disabled={isLoading}
            className="p-1.5 text-gray-500 hover:text-gray-800 bg-white border border-gray-200 rounded-xl transition-all flex items-center gap-1 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">새로고침</span>
          </button>
        </div>

        {/* 본문 목록 */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-slate-50/50">
          {!isAdmin && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                현재 계정에 관리자(role: admin) 권한이 부여되지 않았습니다. 테스트를 원하시면 Supabase profiles 테이블에서 role을 'admin'으로 변경하시거나 아래 기능을 둘러보실 수 있습니다.
              </span>
            </div>
          )}

          {isLoading ? (
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
                      <span>작성자: <strong className="text-gray-800">{review?.userNickname || '알 수 없음'}</strong></span>
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
                        disabled={isActionLoading}
                        className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>리뷰 숨김(블라인드)</span>
                      </button>

                      <button
                        onClick={() => handleAction(report.id, 'delete')}
                        disabled={isActionLoading}
                        className="py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50"
                        title="리뷰 영구 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>영구 삭제</span>
                      </button>

                      <button
                        onClick={() => handleAction(report.id, 'reject')}
                        disabled={isActionLoading}
                        className="py-1.5 px-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>신고 기각</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
