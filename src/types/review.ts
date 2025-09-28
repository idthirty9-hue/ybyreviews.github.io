export interface Review {
  id: string;
  user_id: string;
  movie_id: number;
  movie_title: string;
  rating: number;
  title: string;
  content: string;
  pros: string[];
  cons: string[];
  recommendation: 'highly_recommend' | 'recommend' | 'neutral' | 'not_recommend';
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_avatar?: string;
}

export interface ReviewFormData {
  rating: number;
  title: string;
  content: string;
  pros: string[];
  cons: string[];
  recommendation: 'highly_recommend' | 'recommend' | 'neutral' | 'not_recommend';
}