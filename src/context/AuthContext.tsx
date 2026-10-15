'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types/features';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  isLoadingAuth: boolean;
  favoriteIds: Set<string>;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'signup';
  openAuthModal: (mode?: 'login' | 'signup') => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, nickname: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  toggleFavorite: (restaurantId: string) => Promise<boolean>;
  isFavorite: (restaurantId: string) => boolean;
  refreshFavorites: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

  const openAuthModal = useCallback((mode: 'login' | 'signup' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  // 프로필 정보 조회
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data && !error) {
        setProfile({
          id: data.id,
          nickname: data.nickname || '동네미식가',
          avatarUrl: data.avatar_url,
          role: data.role || 'user',
          createdAt: data.created_at,
        });
      }
    } catch (e) {
      console.warn('Profile fetch warning:', e);
    }
  }, []);

  // 즐겨찾기 목록 조회
  const fetchFavorites = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('restaurant_id')
        .eq('user_id', userId);

      if (data && !error) {
        const ids = new Set(data.map((f: { restaurant_id: string }) => f.restaurant_id));
        setFavoriteIds(ids);
      }
    } catch (e) {
      console.warn('Favorites fetch warning:', e);
    }
  }, []);

  // 인증 상태 리스너
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          setUser(session.user);
          await Promise.all([
            fetchProfile(session.user.id),
            fetchFavorites(session.user.id),
          ]);
        }
      } catch (err) {
        console.warn('Auth session init warning:', err);
      } finally {
        if (mounted) setIsLoadingAuth(false);
      }
    }

    initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
        await Promise.all([
          fetchProfile(session.user.id),
          fetchFavorites(session.user.id),
        ]);
      } else {
        setUser(null);
        setProfile(null);
        setFavoriteIds(new Set());
      }
      setIsLoadingAuth(false);
    });

    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [fetchProfile, fetchFavorites]);

  // 로그인
  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        let msg = error.message;
        if (error.message.includes('Invalid login credentials')) {
          msg = '이메일 또는 비밀번호가 일치하지 않습니다.';
        }
        return { success: false, error: msg };
      }

      if (data.user) {
        setUser(data.user);
        await Promise.all([
          fetchProfile(data.user.id),
          fetchFavorites(data.user.id),
        ]);
        closeAuthModal();
        return { success: true };
      }

      return { success: false, error: '로그인에 실패했습니다.' };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : '로그인 처리 중 오류가 발생했습니다.',
      };
    }
  };

  // 회원가입
  const signup = async (email: string, password: string, nickname: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nickname: nickname.trim(),
            role: 'user',
          },
        },
      });

      if (error) {
        let msg = error.message;
        if (error.message.includes('already registered')) {
          msg = '이미 가입된 이메일 주소입니다.';
        } else if (error.message.includes('Password should be at least')) {
          msg = '비밀번호는 최소 6자 이상이어야 합니다.';
        }
        return { success: false, error: msg };
      }

      if (data.user) {
        setUser(data.user);
        // 프로필 테이블 직접 등록 (트리거 실패 대비 upsert)
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            nickname: nickname.trim(),
            role: 'user',
          });
        } catch (profileErr) {
          console.warn('Profile direct save warning:', profileErr);
        }

        await fetchProfile(data.user.id);
        closeAuthModal();
        return { success: true };
      }

      return { success: false, error: '회원가입에 실패했습니다.' };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : '회원가입 처리 중 오류가 발생했습니다.',
      };
    }
  };

  // 로그아웃
  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setFavoriteIds(new Set());
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // 즐겨찾기 토글 (추가/삭제)
  const toggleFavorite = async (restaurantId: string): Promise<boolean> => {
    if (!user) {
      openAuthModal('login');
      return false;
    }

    const isCurrentlyFav = favoriteIds.has(restaurantId);

    // 낙관적 UI 업데이트
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isCurrentlyFav) {
        next.delete(restaurantId);
      } else {
        next.add(restaurantId);
      }
      return next;
    });

    try {
      if (isCurrentlyFav) {
        // 즐겨찾기 삭제
        const { error } = await supabase
          .from('favorites')
          .delete()
          .match({ user_id: user.id, restaurant_id: restaurantId });

        if (error) throw error;
        return false;
      } else {
        // 즐겨찾기 추가
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: user.id, restaurant_id: restaurantId });

        if (error) throw error;
        return true;
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      // 롤백
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isCurrentlyFav) {
          next.add(restaurantId);
        } else {
          next.delete(restaurantId);
        }
        return next;
      });
      return isCurrentlyFav;
    }
  };

  const isFavorite = useCallback(
    (restaurantId: string) => favoriteIds.has(restaurantId),
    [favoriteIds]
  );

  const refreshFavorites = useCallback(async () => {
    if (user) await fetchFavorites(user.id);
  }, [user, fetchFavorites]);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAdmin,
        isLoadingAuth,
        favoriteIds,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        login,
        signup,
        logout,
        toggleFavorite,
        isFavorite,
        refreshFavorites,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
