import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import Raiz from './Raiz.jsx';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Raiz />
  </React.StrictMode>
);

reportWebVitals();
