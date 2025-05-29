import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { WebsimSocket, useQuery } from '@websim/db';

// Initialize WebsimSocket globally
const room = new WebsimSocket({
  schema: {
    posts: { 
      id: "uuid", 
      message: "text",
    },
  }
});

function App() {
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    window.websim.getCurrentUser().then(setCurrentUser);
  }, []);

  // Query to fetch posts, joining with user table to get username and avatar
  const { data: postsData, loading: postsLoading, error: postsError } = useQuery(
    room.query(`
      SELECT
        p.id,
        p.message,
        p.created_at,
        p.user_id,
        u.username,
        u.avatar_url
      FROM public.posts p
      JOIN public.user u ON p.user_id = u.id
      ORDER BY p.created_at DESC
      LIMIT 50
    `)
  );

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await room.collection('posts').create({
        message: newMessage,
      });
      setNewMessage(''); 
    } catch (error) {
      console.error("Failed to create post:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-blue-600">MicroBlogger</h1>
        {currentUser && (
          <p className="text-gray-600">
            Welcome, <img src={currentUser.avatar_url} alt={currentUser.username} className="inline-block w-6 h-6 rounded-full mr-1" />
            {currentUser.username}!
          </p>
        )}
      </header>

      {currentUser && (
        <form onSubmit={handlePostSubmit} className="mb-8 p-6 bg-white rounded-lg shadow-md">
          <textarea
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            rows="3"
            placeholder="What's on your mind?"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={isSubmitting}
          />
          <button
            type="submit"
            className="mt-3 w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50"
            disabled={!newMessage.trim() || isSubmitting}
          >
            {isSubmitting ? 'Posting...' : 'Post'}
          </button>
        </form>
      )}

      <section id="posts-feed">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Recent Posts</h2>
        {postsLoading && <p className="text-center text-gray-500">Loading posts...</p>}
        {postsError && <p className="text-center text-red-500">Error loading posts: {postsError.message}</p>}
        
        {!postsLoading && !postsError && postsData && postsData.length === 0 && (
          <p className="text-center text-gray-500">No posts yet. Be the first to share something!</p>
        )}

        {postsData && postsData.map((post) => (
          <div key={post.id} className="bg-white p-5 mb-4 rounded-lg shadow-md">
            <div className="flex items-center mb-3">
              <img
                src={post.avatar_url || `https://images.websim.com/avatar/${post.username}`} 
                alt={post.username}
                className="w-10 h-10 rounded-full mr-3 border-2 border-gray-200"
              />
              <div>
                <p className="font-semibold text-gray-800">{post.username}</p>
                <p className="text-xs text-gray-500">{formatDate(post.created_at)}</p>
              </div>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap">{post.message}</p>
          </div>
        ))}
      </section>
      
      <footer className="text-center mt-12 text-sm text-gray-500">
        <p>Powered by WebsimSocket</p>
      </footer>
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);