'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  MapPin,
  Phone,
  Building,
  CheckCircle2,
  Copy,
  Check,
  Navigation,
  ExternalLink,
  Heart,
  Star,
  Camera,
  Trash2,
  ShieldAlert,
  Loader2,
  MessageSquarePlus,
  AlertCircle,
  Image as ImageIcon,
} from 'lucide-react';
import { Restaurant } from '@/types/restaurant';
import { Review, ReviewStats } from '@/types/features';
import { formatDistance } from '@/utils/distance';
import { useAuth } from '@/context/AuthContext';
import { apiUrl } from '@/lib/api';
import ReportModal from './ReportModal';

interface RestaurantDetailProps {
  restaurant: Restaurant | null;
  distanceInMeters: number | null;
  onClose: () => void;
}

export default function RestaurantDetail({
  restaurant,
  distanceInMeters,
  onClose,
}: RestaurantDetailProps) {
  const { user, profile, isAdmin, isFavorite, toggleFavorite, openAuthModal } = useAuth();
  const [copied, setCopied] = useState(false);

  // 리뷰 및 평점 상태
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ averageRating: 0, totalReviews: 0 });
  const [isLoadingReviews, setIsLoadingReviews] = useState<boolean>(false);

  // 리뷰 작성 폼 상태
  const [isWritingReview, setIsWritingReview] = useState<boolean>(false);
  const [newRating, setNewRating] = useState<number>(5);
  const [newContent, setNewContent] = useState<string>('');
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // 신고 모달 상태
  const [reportingReview, setReportingReview] = useState<Review | null>(null);

  // 사진 확대 모달 상태
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 리뷰 목록 및 평점 통계 조회
  const fetchReviews = useCallback(async (restaurantId: string) => {
    setIsLoadingReviews(true);
    try {
      const res = await fetch(
        apiUrl(`/api/reviews?restaurantId=${encodeURIComponent(restaurantId)}`)
      );
      const json = await res.json();
      if (json.success) {
        setReviews(json.reviews || []);
        setStats(json.stats || { averageRating: 0, totalReviews: 0 });
      }
    } catch (e) {
      console.error('Failed to fetch reviews:', e);
    } finally {
      setIsLoadingReviews(false);
    }
  }, []);

  useEffect(() => {
    if (restaurant?.id) {
      fetchReviews(restaurant.id);
      setIsWritingReview(false);
      setNewContent('');
      setNewPhotos([]);
      setReviewError(null);
    }
  }, [restaurant?.id, fetchReviews]);

  if (!restaurant) return null;

  const favorited = isFavorite(restaurant.id);

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(restaurant.roadAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  // 사진 첨부 처리 (Base64 변환)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (newPhotos.length + files.length > 3) {
      alert('사진은 최대 3장까지 등록할 수 있습니다.');
      return;
    }

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 등록할 수 있습니다.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('이미지 용량은 5MB 이하만 가능합니다.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setNewPhotos((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    setNewPhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  // 리뷰 등록 제출
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('login');
      return;
    }

    if (!newContent.trim()) {
      setReviewError('리뷰 내용을 입력해 주세요.');
      return;
    }

    setIsSubmittingReview(true);
    setReviewError(null);

    try {
      const res = await fetch(apiUrl('/api/reviews'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          userId: user.id,
          userNickname: profile?.nickname || '회원',
          rating: newRating,
          content: newContent.trim(),
          photoUrls: newPhotos,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || json.detail || '리뷰 등록에 실패했습니다.');
      }

      // 등록 성공
      setIsWritingReview(false);
      setNewContent('');
      setNewPhotos([]);
      await fetchReviews(restaurant.id);
    } catch (err: unknown) {
      setReviewError(err instanceof Error ? err.message : '리뷰 등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // 리뷰 삭제
  const handleDeleteReview = async (reviewId: string) => {
    if (!user) return;
    if (!confirm('정말 이 리뷰를 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(
        apiUrl(`/api/reviews?id=${reviewId}&userId=${user.id}`),
        {
          method: 'DELETE',
        }
      );
      const json = await res.json();
      if (json.success) {
        await fetchReviews(restaurant.id);
      } else {
        alert(json.message || '리뷰 삭제에 실패했습니다.');
      }
    } catch (e) {
      console.error('Failed to delete review:', e);
      alert('오류가 발생했습니다.');
    }
  };

  // 카카오 지도 링크
  const kakaoMapUrl =
    restaurant.hasCoordinates && restaurant.latitude && restaurant.longitude
      ? `https://map.kakao.com/link/map/${encodeURIComponent(restaurant.name)},${restaurant.latitude},${restaurant.longitude}`
      : `https://map.kakao.com/link/search/${encodeURIComponent(restaurant.roadAddress || restaurant.name)}`;

  const kakaoRouteUrl =
    restaurant.hasCoordinates && restaurant.latitude && restaurant.longitude
      ? `https://map.kakao.com/link/to/${encodeURIComponent(restaurant.name)},${restaurant.latitude},${restaurant.longitude}`
      : `https://map.kakao.com/link/search/${encodeURIComponent(restaurant.roadAddress || restaurant.name)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col scale-in-95 duration-200">
        {/* 상단 드래그 핸들 (모바일 전용) */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center bg-white">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* 헤더 */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-start justify-between gap-3 sticky top-0 bg-white/95 backdrop-blur-xs z-10">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-md">
                {restaurant.category}
              </span>
              {restaurant.subCategory && (
                <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded font-medium">
                  {restaurant.subCategory}
                </span>
              )}
              {stats.totalReviews > 0 ? (
                <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold rounded flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>{stats.averageRating}</span>
                  <span className="text-gray-400 font-normal">({stats.totalReviews})</span>
                </span>
              ) : (
                <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                  리뷰 첫 작성 도전!
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900 break-words">{restaurant.name}</h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* 즐겨찾기 버튼 */}
            <button
              onClick={() => toggleFavorite(restaurant.id)}
              className={`p-2 rounded-full border transition-all ${
                favorited
                  ? 'bg-rose-50 border-rose-200 text-rose-500 hover:bg-rose-100'
                  : 'bg-white border-gray-200 text-gray-400 hover:text-rose-500 hover:border-rose-200'
              }`}
              title={favorited ? '즐겨찾기 해제' : '즐겨찾기 추가'}
            >
              <Heart
                className={`w-5 h-5 transition-transform ${
                  favorited ? 'fill-rose-500 text-rose-500 scale-110' : ''
                }`}
              />
            </button>

            {/* 닫기 버튼 */}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 본문 내용 (스크롤 영역) */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* 직선거리 안내 배너 */}
          {restaurant.hasCoordinates && distanceInMeters !== null && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex items-center justify-between text-xs text-emerald-900">
              <span className="font-semibold">내 현재 위치 기준 직선거리</span>
              <span className="font-bold text-emerald-700 text-sm">
                {formatDistance(distanceInMeters)}
              </span>
            </div>
          )}

          {/* 기본 매장 정보 */}
          <div className="bg-gray-50/80 rounded-2xl p-4 space-y-3 text-xs border border-gray-100">
            {/* 주소 */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 min-w-0">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-gray-900">{restaurant.roadAddress}</div>
                  {restaurant.jibunAddress && (
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      (지번) {restaurant.jibunAddress}
                    </div>
                  )}
                  {restaurant.floor && (
                    <div className="text-[11px] text-gray-600 mt-0.5 flex items-center gap-1">
                      <Building className="w-3 h-3 text-gray-400" />
                      <span>{restaurant.floor}</span>
                      {restaurant.buildingName && <span>({restaurant.buildingName})</span>}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleCopyAddress}
                className="shrink-0 p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all flex items-center gap-1 text-[11px]"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-bold">복사됨</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>복사</span>
                  </>
                )}
              </button>
            </div>

            {/* 전화번호 */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200/60">
              <div className="flex items-center gap-2.5 min-w-0">
                <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium text-gray-800">
                  {restaurant.phone || '전화번호 미제공'}
                </span>
              </div>
              {restaurant.phone && restaurant.phone.startsWith('0') && (
                <a
                  href={`tel:${restaurant.phone}`}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1"
                >
                  <Phone className="w-3 h-3" />
                  <span>전화걸기</span>
                </a>
              )}
            </div>

            {/* 영업상태 */}
            <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-gray-600">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>영업 상태 (공공데이터)</span>
              </div>
              <span className="font-bold text-emerald-700">{restaurant.businessStatus}</span>
            </div>
          </div>

          {/* 길찾기 버튼 바 */}
          <div className="grid grid-cols-2 gap-2">
            <a
              href={kakaoRouteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3 bg-yellow-400 hover:bg-yellow-500 text-yellow-950 font-bold rounded-xl text-xs text-center flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>카카오맵 길찾기</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>

            <a
              href={kakaoMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs text-center flex items-center justify-center gap-1.5 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-gray-500" />
              <span>지도에서 보기</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          </div>

          {/* ============================================================ */}
          {/* 리뷰 & 사진 등록 섹션 */}
          {/* ============================================================ */}
          <div className="pt-3 border-t border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900">방문자 리뷰 및 사진</h3>
                <span className="text-xs text-gray-500 font-semibold">({stats.totalReviews})</span>
              </div>

              {!isWritingReview && (
                <button
                  onClick={() => {
                    if (!user) {
                      openAuthModal('login');
                    } else {
                      setIsWritingReview(true);
                    }
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-xs active:scale-95"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5" />
                  <span>리뷰 쓰기</span>
                </button>
              )}
            </div>

            {/* 리뷰 작성 폼 */}
            {isWritingReview && (
              <form
                onSubmit={handleSubmitReview}
                className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-4 space-y-3 animate-in fade-in"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950">
                    {profile?.nickname || '회원'} 님의 솔직한 리뷰
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsWritingReview(false)}
                    className="text-gray-400 hover:text-gray-700 text-xs"
                  >
                    취소
                  </button>
                </div>

                {reviewError && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{reviewError}</span>
                  </div>
                )}

                {/* 별점 선택기 */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    별점 선택
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setNewRating(star)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= newRating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-amber-600 ml-1.5">
                      {newRating}점
                    </span>
                  </div>
                </div>

                {/* 리뷰 내용 입력 */}
                <div>
                  <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="맛, 분위기, 가성비 등 솔직한 방문 경험을 남겨주세요."
                    rows={3}
                    required
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all resize-none"
                  />
                </div>

                {/* 사진 첨부 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-gray-600 flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5 text-gray-500" />
                      <span>음식/매장 사진 첨부 ({newPhotos.length}/3)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={newPhotos.length >= 3}
                      className="text-[11px] text-emerald-700 font-bold hover:underline disabled:opacity-40"
                    >
                      + 사진 추가
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </div>

                  {newPhotos.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto py-1">
                      {newPhotos.map((photo, idx) => (
                        <div
                          key={idx}
                          className="relative w-16 h-16 rounded-xl overflow-hidden border border-emerald-300 shrink-0 group"
                        >
                          <img src={photo} alt="미리보기" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(idx)}
                            className="absolute top-1 right-1 p-0.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsWritingReview(false)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-1"
                  >
                    {isSubmittingReview ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>등록 중...</span>
                      </>
                    ) : (
                      <span>리뷰 등록 완료</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* 리뷰 목록 */}
            {isLoadingReviews ? (
              <div className="py-8 text-center text-gray-400 space-y-1">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-emerald-600" />
                <p className="text-xs">리뷰를 불러오는 중입니다...</p>
              </div>
            ) : reviews.length === 0 ? (
              <div className="py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-500 space-y-1">
                <Star className="w-6 h-6 mx-auto text-amber-300" />
                <p className="text-xs font-bold text-gray-700">아직 등록된 리뷰가 없습니다.</p>
                <p className="text-[11px] text-gray-400">첫 번째 리뷰와 사진을 남겨보세요!</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {reviews.map((rev) => {
                  const isAuthor = user?.id === rev.userId;
                  const canDelete = isAuthor || isAdmin;

                  return (
                    <div
                      key={rev.id}
                      className="bg-white rounded-2xl p-3.5 border border-gray-200 shadow-xs space-y-2"
                    >
                      {/* 작성자 & 별점 & 조치 버튼 */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{rev.userNickname}</span>
                          <div className="flex items-center gap-0.5 text-amber-400">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${
                                  i < rev.rating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                          <span>{new Date(rev.createdAt).toLocaleDateString('ko-KR')}</span>

                          {/* 신고 버튼 */}
                          <button
                            type="button"
                            onClick={() => setReportingReview(rev)}
                            className="p-1 hover:text-red-600 transition-colors"
                            title="부적절한 리뷰 신고하기"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </button>

                          {/* 삭제 버튼 (작성자 또는 관리자) */}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteReview(rev.id)}
                              className="p-1 hover:text-red-600 transition-colors"
                              title="리뷰 삭제하기"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 본문 */}
                      <p className="text-xs text-gray-800 leading-relaxed break-words whitespace-pre-wrap">
                        {rev.content}
                      </p>

                      {/* 사진 갤러리 */}
                      {rev.photoUrls && rev.photoUrls.length > 0 && (
                        <div className="flex items-center gap-2 pt-1 overflow-x-auto">
                          {rev.photoUrls.map((url, idx) => (
                            <button
                              type="button"
                              key={idx}
                              onClick={() => setZoomedPhoto(url)}
                              className="w-16 h-16 rounded-xl overflow-hidden border border-gray-200 shrink-0 group relative cursor-zoom-in"
                            >
                              <img
                                src={url}
                                alt="리뷰 사진"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                <ImageIcon className="w-4 h-4" />
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 하단 닫기 바 */}
        <div className="p-3.5 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs rounded-xl transition-colors"
          >
            닫기
          </button>
        </div>
      </div>

      {/* 신고 모달 */}
      <ReportModal
        isOpen={Boolean(reportingReview)}
        review={reportingReview}
        onClose={() => setReportingReview(null)}
        onSuccess={() => {
          if (restaurant?.id) fetchReviews(restaurant.id);
        }}
      />

      {/* 사진 확대 모달 */}
      {zoomedPhoto && (
        <div
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setZoomedPhoto(null)}
        >
          <div className="relative max-w-lg max-h-[80vh]">
            <img
              src={zoomedPhoto}
              alt="확대 사진"
              className="w-full h-full object-contain rounded-2xl"
            />
            <button
              onClick={() => setZoomedPhoto(null)}
              className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/90 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
