import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { EmbeddedExample } from './examples/EmbeddedExample';

const root = document.getElementById('embedded-root');
if (root) {
  createRoot(root).render(<EmbeddedExample />);
}
