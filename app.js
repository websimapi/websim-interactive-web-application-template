import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { WebsimSocket, useQuery } from '@websim/db';

// Initialize WebsimSocket globally
const room = new WebsimSocket({
  schema: {
    posts: { 
      id: "uuid", 
      message: "text",
    },
    test_entries: { 
      id: "uuid",
      test_data: "text",
      sequence: "integer",
    }
  }
});

function App() {
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for the DB insertion test
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testInsertionsCount, setTestInsertionsCount] = useState(0);
  const [testError, setTestError] = useState(null);
  const stopTestRef = useRef(false); 

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

  // DB Insertion Test Functions
  const handleStartTest = async () => {
    setIsTestRunning(true);
    setTestInsertionsCount(0);
    setTestError(null);
    stopTestRef.current = false;
    let currentCount = 0;

    console.log("Starting DB insertion test...");

    try {
      while (!stopTestRef.current) {
        await room.collection('test_entries').create({
          test_data: `Test entry ${currentCount + 1}`,
          sequence: currentCount + 1,
        });
        currentCount++;
        setTestInsertionsCount(currentCount);
        await new Promise(resolve => setTimeout(resolve, 10)); 
      }
      if (stopTestRef.current) {
        console.log(`Test stopped by user after ${currentCount} insertions.`);
      }
    } catch (error) {
      console.error("Test failed at insertion:", currentCount + 1, error);
      setTestError(`Failed after ${currentCount} insertions. Error: ${error.message}`);
    } finally {
      setIsTestRunning(false);
      console.log("DB insertion test finished.");
    }
  };

  const handleStopTest = () => {
    stopTestRef.current = true;
    console.log("Attempting to stop DB insertion test...");
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
            disabled={isSubmitting || isTestRunning} 
          />
          <button
            type="submit"
            className="mt-3 w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50"
            disabled={!newMessage.trim() || isSubmitting || isTestRunning} 
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

      <section id="db-test-tool" className="mt-12 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Database Insertion Test Tool</h2>
        {!isTestRunning ? (
          <button
            onClick={handleStartTest}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-md transition-colors"
          >
            Start Insertion Test
          </button>
        ) : (
          <button
            onClick={handleStopTest}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md transition-colors"
          >
            Stop Test
          </button>
        )}
        <div className="mt-4">
          <p className="text-gray-600">Status: {isTestRunning ? <span className="text-yellow-500 font-semibold">Running...</span> : <span className="text-gray-500 font-semibold">Idle</span>}</p>
          <p className="text-gray-600">Successful Insertions: <span className="font-bold">{testInsertionsCount}</span></p>
          {testError && <p className="text-red-500 mt-2">Error: {testError}</p>}
          {stopTestRef.current && !isTestRunning && !testError && <p className="text-blue-500 mt-2">Test stopped by user.</p>}
        </div>
        <p className="text-xs text-gray-400 mt-4">
          This tool attempts to insert records into a 'test_entries' collection incrementally until an error occurs or it's stopped.
          It helps to gauge database insertion capacity. Refresh the page to clear the test collection if needed (data is persistent).
        </p>
      </section>
      
      <footer className="text-center mt-12 text-sm text-gray-500">
        <p>Powered by WebsimSocket</p>
      </footer>
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);