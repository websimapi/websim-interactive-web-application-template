import React from 'react';
import { createRoot } from 'react-dom/client';
import { WebsimSocket, useQuery } from '@websim/db';

const room = new WebsimSocket({
  schema: {
    post: {
      id: "uuid",
      message: "text",
    },
  }
});

function App() {
  const {data: posts, loading} = useQuery(room.collection('post'));

  return <div>
    {loading ? <div>Loading...</div> : <div>
      {posts.map((post) => <div key={post.id}>{post.message}</div>)}
    </div>}
  </div>
}

const root = createRoot(document.getElementById('root'));
root.render(<App />)

