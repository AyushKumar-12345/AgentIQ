import '@testing-library/jest-dom';

// JSDOM mock for scrollIntoView
if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.scrollIntoView = function () {};
}
