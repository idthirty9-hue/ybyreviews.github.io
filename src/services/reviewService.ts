import { supabase } from '../lib/supabase';
import { Review, ReviewFormData } from '../types/review';

export const reviewService = {
  async getReviewsForMovie(movieId: number): Promise<Review[]> {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        user_name:user_id(raw_user_meta_data->name),
        user_avatar:user_id(raw_user_meta_data->avatar_url)
      `)
      .eq('movie_id', movieId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
      return [];
    }

    return data || [];
  },

  async createReview(movieId: number, movieTitle: string, reviewData: ReviewFormData): Promise<Review | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to create a review');
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        user_id: user.id,
        movie_id: movieId,
        movie_title: movieTitle,
        ...reviewData
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating review:', error);
      throw error;
    }

    return data;
  },

  async updateReview(reviewId: string, reviewData: Partial<ReviewFormData>): Promise<Review | null> {
    const { data, error } = await supabase
      .from('reviews')
      .update({
        ...reviewData,
        updated_at: new Date().toISOString()
      })
      .eq('id', reviewId)
      .select()
      .single();

    if (error) {
      console.error('Error updating review:', error);
      throw error;
    }

    return data;
  },

  async deleteReview(reviewId: string): Promise<boolean> {
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId);

    if (error) {
      console.error('Error deleting review:', error);
      throw error;
    }

    return true;
  },

  async getUserReviewForMovie(movieId: number): Promise<Review | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('movie_id', movieId)
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user review:', error);
      return null;
    }

    return data || null;
  }
};