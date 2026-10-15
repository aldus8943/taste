import { Restaurant } from './restaurant';

export type UserRole = 'user' | 'admin';

export interface UserProfile {
  id: string;
  nickname: string;
  avatarUrl?: string;
  role: UserRole;
  createdAt: string;
}

export type ReviewStatus = 'published' | 'hidden' | 'deleted';

export interface Review {
  id: string;
  restaurantId: string;
  userId: string;
  userNickname: string;
  rating: number; // 1 ~ 5
  content: string;
  photoUrls: string[];
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
}

export interface Favorite {
  id: string;
  userId: string;
  restaurantId: string;
  createdAt: string;
  restaurant?: Restaurant;
}

export type ReportStatus = 'pending' | 'resolved_blind' | 'rejected';

export interface Report {
  id: string;
  reviewId: string;
  reporterId: string;
  reporterNickname?: string;
  reason: string;
  detail?: string;
  status: ReportStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  review?: Review;
}
