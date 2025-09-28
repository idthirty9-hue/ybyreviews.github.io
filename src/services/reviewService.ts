import { supabase } from '../lib/supabase';
import { Review, ReviewFormData } from '../types/review';

export const reviewService = {
  async getReviewsForMovie(movieId: number): Promise<Review[]> {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('movie_id', movieId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
      return [];
    }

    // Fetch user details for each review
    const reviewsWithUserData = await Promise.all(
      (data || []).map(async (review) => {
        const { data: userData } = await supabase.auth.admin.getUserById(review.user_id);
        return {
          ...review,
          user_name: userData?.user?.user_metadata?.full_name || 
                    userData?.user?.user_metadata?.name || 
                    userData?.user?.email?.split('@')[0] || 
                    'Anonymous User',
          user_avatar: userData?.user?.user_metadata?.avatar_url || null
        };
      })
    );

    return reviewsWithUserData;
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

    // Add user data to the returned review
    return {
      ...data,
      user_name: user.user_metadata?.full_name || 
                user.user_metadata?.name || 
                user.email?.split('@')[0] || 
                'Anonymous User',
      user_avatar: user.user_metadata?.avatar_url || null
    };
  },

  async updateReview(reviewId: string, reviewData: Partial<ReviewFormData>): Promise<Review | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to update a review');
    }

    const { data, error } = await supabase
      .from('reviews')
      .update({
        ...reviewData,
        updated_at: new Date().toISOString()
      })
      .eq('id', reviewId)
      .eq('user_id', user.id) // Ensure user can only update their own review
      .select()
      .single();

    if (error) {
      console.error('Error updating review:', error);
      throw error;
    }

    // Add user data to the returned review
    return {
      ...data,
      user_name: user.user_metadata?.full_name || 
                user.user_metadata?.name || 
                user.email?.split('@')[0] || 
                'Anonymous User',
      user_avatar: user.user_metadata?.avatar_url || null
    };
  },

  async deleteReview(reviewId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to delete a review');
    }

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId)
      .eq('user_id', user.id); // Ensure user can only delete their own review

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