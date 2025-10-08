// frontend/src/App.jsx
import React from 'react';
import { Provider } from 'react-redux';
import store from './redux/store';
import UrlForm from './components/UrlForm';
import UrlList from './components/UrlList';
import Analytics from './components/Analytics';
import './App.css';

function App() {
  return (
    <Provider store={store}>
      <div className="App">
        <header className="app-header">
          <h1>🔗 URL Shortener</h1>
          <p>Create short, shareable links in seconds</p>
        </header>

        <main className="app-main">
          <section className="form-section">
            <UrlForm />
          </section>

          <section className="list-section">
            <UrlList />
          </section>

          { <section className="analytics-section">
            <Analytics />
          </section> } 
        </main>

        <footer className="app-footer">
          <p>Built with React, Redux, Node.js, PostgreSQL, and Redis</p>
        </footer>
      </div>
    </Provider>
  );
}

export default App;