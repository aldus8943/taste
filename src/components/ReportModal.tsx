'use client';

import React, { useState } from 'react';
import { X, ShieldAlert, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Review } from '@/types/features';

interface ReportModalProps {
  isOpen: boolean;
  review: Review | null;
  onClose: () => void;
  onSuccess: () => void;
}

const REPORT_REASONS = [
  '광고 / 홍보성 / 스팸 게시글',
  '욕설, 비방, 차별 및 모욕적인 표현',
  '허위 사실 유포 및 가게 악의적 음해',
  '부적절하거나 관련 없는 사진 첨부',
  '개인정보 노출 위험',
  '기타 부적절한 사유',
];

export default function ReportModal({
  isOpen,
  review,
  onClose,
  onSuccess,
}: ReportModalProps) {
  const { user, profile, openAuthModal } = useAuth();
  const [selectedReason, setSelectedReason] = useState<string>(REPORT_REASONS[0]);
  const [detail, setDetail] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!isOpen || !review) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('login');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId: review.id,
          reporterId: user.id,
          reporterNickname: profile?.nickname || '회원',
          reason: selectedReason,
          detail: detail.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || '신고 접수에 실패했습니다.');
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : '신고 접수 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-100 flex flex-col scale-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">리뷰 신고하기</h3>
              <p className="text-[11px] text-gray-500">부적절한 리뷰를 관리팀에 신고합니다</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-8 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
            <p className="text-sm font-bold text-gray-900">신고가 접수되었습니다.</p>
            <p className="text-xs text-gray-500">운영팀의 검토 후 신속히 조치하겠습니다.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-3">
            {errorMsg && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 신고 대상 리뷰 요약 */}
            <div className="p-2.5 bg-gray-50 rounded-xl text-xs text-gray-600 border border-gray-100">
              <div className="text-[11px] font-bold text-gray-500 mb-0.5">
                신고 대상: <span className="text-gray-800">{review.userNickname}</span> 님의 리뷰
              </div>
              <p className="line-clamp-2 text-gray-700 italic">"{review.content}"</p>
            </div>

            {/* 사유 선택 */}
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                신고 사유 선택 (필수)
              </label>
              <div className="space-y-1">
                {REPORT_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-2 p-2 rounded-xl text-xs cursor-pointer border transition-all ${
                      selectedReason === reason
                        ? 'bg-red-50/70 border-red-300 text-red-900 font-semibold'
                        : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={() => setSelectedReason(reason)}
                      className="text-red-600 focus:ring-red-500 w-3.5 h-3.5"
                    />
                    <span className="text-[11px]">{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 상세 사유 작성 */}
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                상세 설명 (선택)
              </label>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="구체적인 신고 내용을 적어주시면 빠른 처리에 도움이 됩니다."
                rows={2}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all resize-none"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>접수 중...</span>
                  </>
                ) : (
                  <span>신고 접수</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
