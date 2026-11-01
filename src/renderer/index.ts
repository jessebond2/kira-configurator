import React from 'react';
import ReactDOM from 'react-dom';
import './state/settings';
import App from './app';

const root = document.getElementById('app');
if (!root) throw new Error('No root present, cannot mount');

ReactDOM.render(React.createElement(App), root);
