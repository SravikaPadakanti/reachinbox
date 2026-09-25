import React from "react";
const P = ({ d, size = 18, fill = "none", ...r }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...r}>{d}</svg>
);
export const Clock = (p) => <P {...p} d={<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>} />;
export const Send = (p) => <P {...p} d={<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />} />;
export const Search = (p) => <P {...p} d={<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>} />;
export const Filter = (p) => <P {...p} d={<path d="M3 5h18l-7 8v6l-4-2v-4z" />} />;
export const Refresh = (p) => <P {...p} d={<><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></>} />;
export const Star = ({ on, ...p }) => <P {...p} fill={on ? "#F5B400" : "none"} d={<path d="m12 3 2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 17l-5.6 3 1.3-6.2L3 9.5l6.3-.7z" />} />;
export const Back = (p) => <P {...p} d={<path d="M19 12H5m6-6-6 6 6 6" />} />;
export const Clip = (p) => <P {...p} d={<path d="m21 11-9 9a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8" />} />;
export const Upload = (p) => <P {...p} d={<path d="M12 16V4m-5 5 5-5 5 5M4 20h16" />} />;
export const Chevron = (p) => <P {...p} d={<path d="m6 9 6 6 6-6" />} />;
export const Google = () => (
  <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.4-4.8 7.1l7.6 5.9c4.4-4.1 7-10.1 7-17.5z"/><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
);
