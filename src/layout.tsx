import React, { type ReactNode } from 'react';
import './layout.css';

interface LayoutProps {
  children: ReactNode;
  view: string;
  setView: (view: string) => void;
}

const Logo: React.FC = () => {
  return (
    <>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-box">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
      <span className="logo-text">CognitionIndex</span>
    </>
  );
}

export const Layout: React.FC<LayoutProps> = ({ children, view, setView }) => {
  return (
    <div className="app-layout">
      {/* Navigation Header */}
      <header className="app-header">
        <div className="logo-container">
          <Logo />
        </div>
        <nav className="header-nav">
          <a href="#" className="header-link">Docs</a>
          <a href="#" className="header-link">Support</a>
        </nav>
        <div className="user-profile">
          <div className="avatar">JB</div>
        </div>
      </header>

      {/* Body Area: Sidebar + Content */}
      <div className="app-body">
        <aside className="app-sidebar">
          <nav className="sidebar-nav">
            {React.Children.map(children, (child) => {
              if (React.isValidElement(child)) {
                const { id, label } = child.props as any;
                return (
                  <button
                    key={id}
                    className="sidebar-link"
                    onClick={() => setView(id)}
                  >
                    {label || id}
                  </button>
                );
              }
              return null;
            })}
          </nav>
        </aside>

        <main className="app-content">
          <div className="content-container">
            {React.Children.map(children, (child) => {
              if (React.isValidElement(child)) {
                const { id, label } = child.props as any;
                if (id === view) {
                  return child;
                }
              }
              return null;
            })}
          </div>
        </main>
      </div>
    </div>
  );
};
