import type { ReactNode } from 'react';
import type { View } from '../../types';
import Sidebar from './Sidebar';
import Header from './Header';

interface Props {
  view: View;
  setView: (v: View) => void;
  pollingStatus: 'idle' | 'polling' | 'error';
  children: ReactNode;
}

export default function Layout({ view, setView, pollingStatus, children }: Props) {
  return (
    <div className="layout">
      <Sidebar view={view} setView={setView} />
      <div className="layout__body">
        <Header pollingStatus={pollingStatus} />
        <main className="layout__content">
          {children}
        </main>
      </div>
    </div>
  );
}
