import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { MovieGrid } from './components/MovieGrid';
import { MovieModal } from './components/MovieModal';
import { LoadingSpinner } from './components/LoadingSpinner';
import { movieService } from './services/movieService';
import { Movie } from './types/movie';

function App() {
  const [currentSection, setCurrentSection] = useState('home');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [featuredMovie, setFeaturedMovie] = useState<Movie | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadMovies();
  }, []);

  const loadMovies = async () => {
    try {
      setLoading(true);
      const popularMovies = await movieService.getPopularMovies();
      setMovies(popularMovies);
      setFeaturedMovie(popularMovies[0] || null);
      setCurrentSection('home');
    } catch (error) {
      console.error('Error loading movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      // If search is empty, go back to home
      await loadMovies();
      return;
    }

    try {
      setLoading(true);
      const searchResults = await movieService.searchMovies(query);
      setMovies(searchResults);
      setCurrentSection('search');
    } catch (error) {
      console.error('Error searching movies:', error);
      setMovies([]); // Show empty results on error
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = async (section: string) => {
    setCurrentSection(section);
    setSearchQuery('');

    try {
      setLoading(true);
      let newMovies: Movie[] = [];

      switch (section) {
        case 'home':
          newMovies = await movieService.getPopularMovies();
          break;
        case 'trending':
          newMovies = await movieService.getTrendingMovies();
          break;
        case 'top-rated':
          newMovies = await movieService.getPopularMovies();
          newMovies = newMovies.sort((a, b) => b.vote_average - a.vote_average);
          break;
        case 'coming-soon':
          newMovies = await movieService.getPopularMovies();
          newMovies = newMovies.filter(
            (movie) => new Date(movie.release_date) > new Date()
          );
          break;
        default:
          newMovies = await movieService.getPopularMovies();
      }

      setMovies(newMovies);
    } catch (error) {
      console.error('Error loading section:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMovieClick = (movie: Movie) => {
    setSelectedMovie(movie);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMovie(null);
  };

  const getSectionTitle = () => {
    if (searchQuery && currentSection === 'search') {
      return `Search Results for "${searchQuery}"`;
    }
    switch (currentSection) {
      case 'home':
        return 'Popular Movies';
      case 'trending':
        return 'Trending Now';
      case 'top-rated':
        return 'Top Rated Movies';
      case 'coming-soon':
        return 'Coming Soon';
      default:
        return 'Movies';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onSearch={handleSearch}
        onNavigate={handleNavigate}
        currentSection={currentSection}
      />

      {/* Hero Section */}
      {currentSection === 'home' && !searchQuery && featuredMovie && (
        <HeroSection
          featuredMovie={featuredMovie}
          onWatchTrailer={() => console.log('Watch trailer')}
          onViewDetails={() => handleMovieClick(featuredMovie)}
        />
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {getSectionTitle()}
          </h2>
          <p className="text-gray-600">
            {searchQuery && currentSection === 'search'
              ? `Found ${movies.length} results`
              : 'Discover your next favorite movie'}
          </p>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : movies.length === 0 && searchQuery && currentSection === 'search' ? (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg mb-2">No movies found for "{searchQuery}"</div>
            <div className="text-gray-400 mb-4">Try searching for a different movie title</div>
            <button
              onClick={() => handleSearch('')}
              className="text-red-600 hover:text-red-700 font-medium transition-colors"
            >
              Clear search and browse all movies
            </button>
          </div>
        ) : (
          <MovieGrid movies={movies} onMovieClick={handleMovieClick} />
        )}
      </main>

      {/* Movie Modal */}
      <MovieModal
        movie={selectedMovie}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">C</span>
                </div>
                <span className="text-xl font-bold">CineReviews</span>
              </div>
              <p className="text-gray-400 mb-4 max-w-md">
                Your ultimate destination for movie reviews, ratings, and
                recommendations. Discover your next favorite film with our
                curated collection.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Movies</h4>
              <ul className="space-y-2 text-gray-400">
                <li className="hover:text-white transition-colors">Popular</li>
                <li className="hover:text-white transition-colors">Top Rated</li>
                <li className="hover:text-white transition-colors">Coming Soon</li>
                <li className="hover:text-white transition-colors">Trending</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li className="hover:text-white transition-colors">Help Center</li>
                <li className="hover:text-white transition-colors">Contact Us</li>
                <li className="hover:text-white transition-colors">Privacy Policy</li>
                <li className="hover:text-white transition-colors">Terms of Service</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 CineReviews. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
