'use client';

import React, { useState } from 'react';
import { X, Mail, Lock, User, LogIn, UserPlus, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function AuthModal() {
  const { isAuthModalOpen, authModalMode, closeAuthModal, openAuthModal, login, signup } =
    useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage('이메일과 비밀번호를 모두 입력해 주세요.');
      return;
    }

    if (authModalMode === 'signup' && !nickname.trim()) {
      setErrorMessage('사용하실 닉네임을 입력해 주세요.');
      return;
    }

    setIsLoading(true);

    try {
      if (authModalMode === 'login') {
        const res = await login(email.trim(), password);
        if (!res.success) {
          setErrorMessage(res.error || '로그인에 실패했습니다.');
        }
      } else {
        const res = await signup(email.trim(), password, nickname.trim());
        if (!res.success) {
          setErrorMessage(res.error || '회원가입에 실패했습니다.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 빠른 테스트용 관리자/데모 계정 자동 입력
  const handleDemoFill = () => {
    setEmail('demo@taste.com');
    setPassword('test1234!');
    if (authModalMode === 'signup') {
      setNickname('맛있는동네탐험가');
    }
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-100 flex flex-col scale-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="p-5 pb-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
              {authModalMode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {authModalMode === 'login' ? '로그인' : '회원가입'}
              </h2>
              <p className="text-[11px] text-gray-500">
                {authModalMode === 'login'
                  ? '즐겨찾기와 나만의 솔직 리뷰를 남겨보세요'
                  : '30초 만에 가입하고 동네 맛집을 기록하세요'}
              </p>
            </div>
          </div>
          <button
            onClick={closeAuthModal}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 탭 전환 */}
        <div className="flex border-b border-gray-100 px-5 pt-2">
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              openAuthModal('login');
            }}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-all ${
              authModalMode === 'login'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              openAuthModal('signup');
            }}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-all ${
              authModalMode === 'signup'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            회원가입
          </button>
        </div>

        {/* 폼 본문 */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {errorMessage && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {authModalMode === 'signup' && (
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">
                닉네임
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="예: 미식가길동"
                  maxLength={15}
                  required
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">
              이메일 주소
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">
              비밀번호
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6자리 이상 비밀번호"
                minLength={6}
                required
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>처리 중...</span>
              </>
            ) : (
              <span>{authModalMode === 'login' ? '로그인하기' : '무료 회원가입'}</span>
            )}
          </button>

          {/* 데모 계정 자동 입력 버튼 */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleDemoFill}
              className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>테스트용 정보 자동 채우기</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
