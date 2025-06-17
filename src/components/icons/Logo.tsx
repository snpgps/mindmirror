import React from 'react';

const Logo = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <title>MindMirror Logo</title>
    {/* A stylized 'M' combined with a reflection/mirror idea */}
    <path d="M4 12c0-4.418 3.582-8 8-8s8 3.582 8 8-3.582 8-8 8" />
    <path d="M12 2v20" />
    <path d="M4 12h16" />
    <path d="M8.5 7L12 10.5L15.5 7" />
    <path d="M8.5 17L12 13.5L15.5 17" />
  </svg>
);

export default Logo;
