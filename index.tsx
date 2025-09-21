import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/shared/ErrorBoundary';

const rootElement = document.getElementById('root');

if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
} else {
  console.error("Fatal Error: Could not find root element with id 'root' to mount the application.");
  // Display a user-friendly message if the root element is missing.
  // This is better than a blank page on a critical configuration error.
  document.body.innerHTML = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; text-align: center; color: #111827; background-color: #f9fafb;">
      <div>
        <h1 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem;">Application Error</h1>
        <p style="color: #6b7280;">The application could not be started because the main HTML element is missing.</p>
      </div>
    </div>
  `;
}