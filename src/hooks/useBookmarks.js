import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { addBookmark, removeBookmark, isBookBookmarked, getBookmarkStatusForBooks } from '../supabase/bookmarks';
import { toast } from 'react-toastify';

export const useBookmarks = () => {
  const [bookmarks, setBookmarks] = useState({});
  const [loading, setLoading] = useState(false);

  // Toggle bookmark status for a book
  const toggleBookmark = useCallback(async (bookId, bookTitle) => {
    try {
      // Check if user is authenticated first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to add books to your wishlist');
        return;
      }

      setLoading(true);
      const isCurrentlyBookmarked = await isBookBookmarked(bookId);

      if (isCurrentlyBookmarked) {
        await removeBookmark(bookId);
        setBookmarks(prev => {
          const newBookmarks = { ...prev };
          delete newBookmarks[bookId];
          return newBookmarks;
        });
        toast.success(`Removed "${bookTitle || 'book'}" from your wishlist`);
      } else {
        await addBookmark(bookId);
        setBookmarks(prev => ({
          ...prev,
          [bookId]: true
        }));
        toast.success(`Added "${bookTitle || 'book'}" to your wishlist`);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast.error('Failed to update wishlist. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Check if a specific book is bookmarked
  const checkBookmarkStatus = useCallback(async (bookId) => {
    try {
      const isBookmarked = await isBookBookmarked(bookId);
      setBookmarks(prev => ({
        ...prev,
        [bookId]: isBookmarked
      }));
      return isBookmarked;
    } catch (error) {
      console.error('Error checking bookmark status:', error);
      return false;
    }
  }, []);

  // Batch check bookmark status for multiple books
  const checkMultipleBookmarks = useCallback(async (bookIds) => {
    try {
      const bookmarkMap = await getBookmarkStatusForBooks(bookIds);
      setBookmarks(prev => ({
        ...prev,
        ...bookmarkMap
      }));
    } catch (error) {
      console.error('Error checking multiple bookmarks:', error);
    }
  }, []);

  // Refresh bookmark status (useful after login/logout)
  const refreshBookmarks = useCallback(async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setBookmarks({});
        return;
      }

      // This would typically fetch all bookmarks, but for now we'll just clear
      // In a real implementation, you might want to fetch all bookmarked book IDs
      setBookmarks({});
    } catch (error) {
      console.error('Error refreshing bookmarks:', error);
    }
  }, []);

  // Listen for auth changes to refresh bookmarks
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        refreshBookmarks();
      }
    });

    return () => subscription.unsubscribe();
  }, [refreshBookmarks]);

  return {
    bookmarks,
    loading,
    toggleBookmark,
    checkBookmarkStatus,
    checkMultipleBookmarks,
    refreshBookmarks,
    isBookmarked: (bookId) => !!bookmarks[bookId]
  };
};