import { supabase } from './supabaseClient';

// Add a book to user's bookmarks
export const addBookmark = async (bookId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('bookmarks')
      .insert({
        user_id: user.id,
        book_id: bookId,
        created_at: new Date().toISOString()
      })
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Error adding bookmark:', error);
    throw error;
  }
};

// Remove a book from user's bookmarks
export const removeBookmark = async (bookId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', user.id)
      .eq('book_id', bookId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error removing bookmark:', error);
    throw error;
  }
};

// Check if a book is bookmarked by the current user
export const isBookBookmarked = async (bookId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
    return !!data;
  } catch (error) {
    console.error('Error checking bookmark status:', error);
    return false;
  }
};

// Get all bookmarked books for the current user
export const getUserBookmarks = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('bookmarks')
      .select(`
        id,
        created_at,
        books (
          id,
          title,
          author,
          description,
          cover_image_url,
          isbn,
          genre,
          publication_year,
          publisher,
          language,
          pages,
          count,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform the data to include bookmark info with book details
    return data.map(bookmark => ({
      ...bookmark.books,
      bookmark_id: bookmark.id,
      bookmarked_at: bookmark.created_at
    }));
  } catch (error) {
    console.error('Error fetching user bookmarks:', error);
    throw error;
  }
};

// Get bookmark status for multiple books (for batch checking)
export const getBookmarkStatusForBooks = async (bookIds) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};

    const { data, error } = await supabase
      .from('bookmarks')
      .select('book_id, id')
      .eq('user_id', user.id)
      .in('book_id', bookIds);

    if (error) throw error;

    // Convert to a map for easy lookup
    const bookmarkMap = {};
    data.forEach(bookmark => {
      bookmarkMap[bookmark.book_id] = bookmark.id;
    });

    return bookmarkMap;
  } catch (error) {
    console.error('Error fetching bookmark status for books:', error);
    return {};
  }
};