import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './AppWithConversationList';
// import App from './AppWithoutConversationList';

// The root component of the app.
// Uncomment above for an example of the app without the conversation list.

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
