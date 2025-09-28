import React, { useState } from 'react';
import { X, Star, Calendar, Clock, Play, Share2, ExternalLink, Youtube } from 'lucide-react';
import { Movie } from '../types/movie';
import { Review, ReviewFormData } from '../types/review';
import { reviewService } from '../services/reviewService';
import { AdBanner } from './AdBanner';
import type { User } from '@supabase/supabase-js';

interface MovieModalProps {
  movie: Movie | null;
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onAuthRequired: () => void;
}

export const MovieModal: React.FC<MovieModalProps> = ({ movie, isOpen, onClose, user, onAuthRequired }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'cast'>('overview');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [newReview, setNewReview] = useState<ReviewFormData>({
    rating: 5,
    title: '',
    content: '',
    pros: [''],
    cons: [''],
    recommendation: 'recommend' as const
  });

  // Load reviews when modal opens and reviews tab is active
  React.useEffect(() => {
    if (isOpen && movie && activeTab === 'reviews') {
      loadReviews();
    }
  }, [isOpen, movie, activeTab]);

  // Load user's existing review
  React.useEffect(() => {
    if (isOpen && movie && user) {
      loadUserReview();
    }
    // Clear user review when user logs out
    if (!user) {
      setUserReview(null);
      setNewReview({
        rating: 5,
        title: '',
        content: '',
        pros: [''],
        cons: [''],
        recommendation: 'recommend' as const
      });
    }
  }, [isOpen, movie, user]);

  const loadReviews = async () => {
    if (!movie) return;
    
    setLoadingReviews(true);
    try {
      const movieReviews = await reviewService.getReviewsForMovie(movie.id);
      setReviews(movieReviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const loadUserReview = async () => {
    if (!movie || !user) return;
    
    try {
      const existingReview = await reviewService.getUserReviewForMovie(movie.id);
      setUserReview(existingReview);
      if (existingReview) {
        setNewReview({
          rating: existingReview.rating,
          title: existingReview.title,
          content: existingReview.content,
          pros: existingReview.pros,
          cons: existingReview.cons,
          recommendation: existingReview.recommendation
        });
      }
    } catch (error) {
      console.error('Error loading user review:', error);
    }
  };

  if (!isOpen || !movie) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: movie.title,
          text: `Check out ${movie.title} on CineReviews!`,
          url: window.location.href
        });
      } catch (error) {
        console.log('Error sharing:', error);
        fallbackShare();
      }
    } else {
      fallbackShare();
    }
  };

  const fallbackShare = () => {
    const url = window.location.href;
    const text = `Check out ${movie.title} on CineReviews! ${url}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      alert('Link copied to clipboard!');
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Link copied to clipboard!');
    }
  };

  const handleWatchTrailer = () => {
    // Generate YouTube search URL for the movie trailer
    const searchQuery = `${movie.title} trailer ${new Date(movie.release_date).getFullYear()}`;
    const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
    window.open(youtubeUrl, '_blank');
  };

  const addProCon = (type: 'pros' | 'cons') => {
    setNewReview(prev => ({
      ...prev,
      [type]: [...prev[type], '']
    }));
  };

  const updateProCon = (type: 'pros' | 'cons', index: number, value: string) => {
    setNewReview(prev => ({
      ...prev,
      [type]: prev[type].map((item, i) => i === index ? value : item)
    }));
  };

  const removeProCon = (type: 'pros' | 'cons', index: number) => {
    setNewReview(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const handleSubmitReview = async () => {
    if (!user) {
      onAuthRequired();
      return;
    }

    if (!movie) return;

    // Validate form
    if (!newReview.title.trim() || !newReview.content.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate pros and cons have at least one non-empty entry
    const validPros = newReview.pros.filter(pro => pro.trim() !== '');
    const validCons = newReview.cons.filter(con => con.trim() !== '');
    
    if (validPros.length === 0) {
      alert('Please add at least one positive aspect');
      return;
    }

    setSubmittingReview(true);
    try {
      // Filter out empty pros and cons
      const cleanedReview = {
        ...newReview,
        pros: validPros,
        cons: validCons
      };

      if (userReview) {
        // Update existing review
        await reviewService.updateReview(userReview.id, cleanedReview);
        alert('Review updated successfully!');
      } else {
        // Create new review
        await reviewService.createReview(movie.id, movie.title, cleanedReview);
        alert('Review submitted successfully!');
      }

      // Reload reviews and user review
      await Promise.all([loadReviews(), loadUserReview()]);
      
      setShowReviewForm(false);
    } catch (error) {
      console.error('Error submitting review:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to submit review: ${errorMessage}`);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!userReview || !user) return;

    if (!confirm('Are you sure you want to delete your review?')) return;

    setSubmittingReview(true);
    try {
      await reviewService.deleteReview(userReview.id);
      await Promise.all([loadReviews(), loadUserReview()]);
      setShowReviewForm(false);
      alert('Review deleted successfully!');
    } catch (error) {
      console.error('Error deleting review:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to delete review: ${errorMessage}`);
    } finally {
      setSubmittingReview(false);
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'highly_recommend': return 'text-green-600 bg-green-100';
      case 'recommend': return 'text-blue-600 bg-blue-100';
      case 'neutral': return 'text-yellow-600 bg-yellow-100';
      case 'not_recommend': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRecommendationText = (recommendation: string) => {
    switch (recommendation) {
      case 'highly_recommend': return 'Highly Recommend';
      case 'recommend': return 'Recommend';
      case 'neutral': return 'Neutral';
      case 'not_recommend': return 'Not Recommend';
      default: return 'Neutral';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl relative">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all duration-200 backdrop-blur-sm hover:scale-110"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Hero Section */}
          <div className="relative h-64 sm:h-80">
            <img
              src={movie.backdrop_path || movie.poster_path}
              alt={movie.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            <div className="absolute bottom-6 left-6 right-6">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">{movie.title}</h2>
              <div className="flex flex-wrap items-center gap-4 text-white/90">
                <div className="flex items-center space-x-1">
                  <Star className="w-5 h-5 text-yellow-400 fill-current" />
                  <span className="font-semibold">{movie.vote_average.toFixed(1)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-5 h-5" />
                  <span>{formatDate(movie.release_date)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-5 h-5" />
                  <span>148 min</span>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <button 
                onClick={handleWatchTrailer}
                className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <Youtube className="w-4 h-4" />
                <span>Watch Trailer</span>
              </button>
              
              <button
                onClick={handleShare}
                className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-gray-700 px-4 py-2 rounded-lg font-semibold transition-all duration-200 border border-gray-300 hover:border-gray-400 hover:scale-105"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>

              <button className="flex items-center space-x-2 bg-blue-500/20 hover:bg-blue-500/30 backdrop-blur-sm text-blue-700 px-4 py-2 rounded-lg font-semibold transition-all duration-200 border border-blue-300 hover:border-blue-400 hover:scale-105">
                <ExternalLink className="w-4 h-4" />
                <span>More Info</span>
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="flex space-x-8">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'reviews', label: 'Detailed Reviews' },
                  { id: 'cast', label: 'Cast & Crew' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-all duration-200 hover:scale-105 ${
                      activeTab === tab.id
                        ? 'border-red-500 text-red-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="min-h-[200px]">
              {activeTab === 'overview' && (
                <div>
                  <p className="text-gray-700 leading-relaxed mb-6">{movie.overview}</p>
                  
                  {/* In-modal Ad */}
                  <div className="my-6 bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-2 text-center">Advertisement</p>
                    <AdBanner
                      adSlot="1234567894"
                      style={{ display: 'block', width: '100%', height: '200px' }}
                      className="mx-auto"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Movie Details</h4>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Release Date:</dt>
                          <dd className="text-gray-900">{formatDate(movie.release_date)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Runtime:</dt>
                          <dd className="text-gray-900">148 minutes</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Rating:</dt>
                          <dd className="text-gray-900">{movie.vote_average.toFixed(1)}/10</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Votes:</dt>
                          <dd className="text-gray-900">{movie.vote_count.toLocaleString()}</dd>
                        </div>
                      </dl>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Additional Info</h4>
                      <p className="text-sm text-gray-600">
                        More movie information and features coming soon.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-6">
                  {/* Add Review Button */}
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Reviews ({reviews.length})
                    </h3>
                    {user ? (
                      <div className="flex gap-2">
                        {userReview && !showReviewForm && (
                          <button
                            onClick={handleDeleteReview}
                            disabled={submittingReview}
                            className="bg-red-100 hover:bg-red-200 disabled:bg-red-50 text-red-700 disabled:text-red-400 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
                          >
                            {submittingReview ? 'Deleting...' : 'Delete My Review'}
                          </button>
                        )}
                        <button
                          onClick={() => setShowReviewForm(!showReviewForm)}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105"
                        >
                          {showReviewForm ? 'Cancel' : userReview ? 'Edit Review' : 'Write Review'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={onAuthRequired}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105"
                      >
                        Sign In to Review
                      </button>
                    )}
                  </div>

                  {/* Review Form */}
                  {showReviewForm && (
                    <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                      <h4 className="font-semibold text-gray-900">
                        {userReview ? 'Edit Your Review' : 'Write Your Detailed Review'}
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                          <select
                            value={newReview.rating}
                            onChange={(e) => setNewReview(prev => ({ ...prev, rating: Number(e.target.value) }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                          >
                            {[1,2,3,4,5,6,7,8,9,10].map(num => (
                              <option key={num} value={num}>{num}/10</option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Recommendation</label>
                          <select
                            value={newReview.recommendation}
                            onChange={(e) => setNewReview(prev => ({ ...prev, recommendation: e.target.value as any }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                          >
                            <option value="highly_recommend">Highly Recommend</option>
                            <option value="recommend">Recommend</option>
                            <option value="neutral">Neutral</option>
                            <option value="not_recommend">Not Recommend</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Review Title</label>
                        <input
                          type="text"
                          value={newReview.title}
                          onChange={(e) => setNewReview(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                          placeholder="Give your review a title..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Review Content</label>
                        <textarea
                          value={newReview.content}
                          onChange={(e) => setNewReview(prev => ({ ...prev, content: e.target.value }))}
                          rows={4}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                          placeholder="Share your detailed thoughts about the movie..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Pros</label>
                          {newReview.pros.map((pro, index) => (
                            <div key={index} className="flex gap-2 mb-2">
                              <input
                                type="text"
                                value={pro}
                                onChange={(e) => updateProCon('pros', index, e.target.value)}
                                className="flex-1 border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                placeholder="What did you like?"
                                required={index === 0}
                              />
                              {newReview.pros.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeProCon('pros', index)}
                                  className="text-red-500 hover:text-red-700 px-2"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addProCon('pros')}
                            className="text-green-600 hover:text-green-700 text-sm font-medium"
                          >
                            + Add Pro
                          </button>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Cons</label>
                          {newReview.cons.map((con, index) => (
                            <div key={index} className="flex gap-2 mb-2">
                              <input
                                type="text"
                                value={con}
                                onChange={(e) => updateProCon('cons', index, e.target.value)}
                                className="flex-1 border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                placeholder="What could be improved?"
                              />
                              {newReview.cons.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeProCon('cons', index)}
                                  className="text-red-500 hover:text-red-700 px-2"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addProCon('cons')}
                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                          >
                            + Add Con
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={handleSubmitReview}
                          disabled={submittingReview}
                          className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105 disabled:hover:scale-100 flex items-center space-x-2"
                        >
                          {submittingReview && (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          )}
                          <span>
                            {submittingReview 
                              ? 'Submitting...' 
                              : userReview 
                                ? 'Update Review' 
                                : 'Submit Review'
                            }
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowReviewForm(false)}
                          disabled={submittingReview}
                          className="bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-700 disabled:text-gray-500 px-6 py-2 rounded-lg font-medium transition-all duration-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Existing Reviews */}
                  {loadingReviews ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-gray-600">Loading reviews...</p>
                    </div>
                  ) : reviews.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No reviews yet. Be the first to review this movie!</p>
                    </div>
                  ) : (
                    reviews.map((review) => (
                    <div key={review.id} className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h5 className="font-semibold text-gray-900 text-lg">{review.title}</h5>
                          <div className="flex items-center space-x-3 text-sm text-gray-500 mt-1">
                            <span className="font-medium">
                              {review.user_name || 'Anonymous User'}
                            </span>
                            <span>•</span>
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              <span className="font-medium">{review.rating}/10</span>
                            </div>
                            <span>•</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRecommendationColor(review.recommendation)}`}>
                              {getRecommendationText(review.recommendation)}
                            </span>
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <p className="text-gray-700 mb-4 leading-relaxed">{review.content}</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <h6 className="font-medium text-green-700 mb-2">👍 Pros</h6>
                          <ul className="space-y-1">
                            {review.pros.map((pro, index) => (
                              <li key={index} className="text-sm text-gray-600 flex items-start">
                                <span className="text-green-500 mr-2">•</span>
                                {pro}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h6 className="font-medium text-red-700 mb-2">👎 Cons</h6>
                          <ul className="space-y-1">
                            {review.cons.map((con, index) => (
                              <li key={index} className="text-sm text-gray-600 flex items-start">
                                <span className="text-red-500 mr-2">•</span>
                                {con}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-gray-500 pt-4 border-t border-gray-100">
                        <span className="text-gray-400">
                          {review.updated_at !== review.created_at ? 'Updated' : 'Posted'} {new Date(review.updated_at).toLocaleDateString()}
                        </span>
                        <button className="hover:text-gray-700 transition-colors">Reply</button>
                        <button className="hover:text-gray-700 transition-colors">Report</button>
                      </div>
                    </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'cast' && (
                <div>
                  <p className="text-gray-500 text-center py-8">Cast and crew information coming soon...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};