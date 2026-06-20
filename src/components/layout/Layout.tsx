import type { ReactNode } from 'react';
import type { View } from '../../types';
import Topbar from './Topbar';

interface Props {
  view: View;
  setView: (v: View) => void;
  children: ReactNode;
}

export default function Layout({ view, setView, children }: Props) {
  return (
    <div className="layout">
      <Topbar view={view} setView={setView} />
      <main className="layout__content">
        <div className="layout__content-inner">
          {children}
        </div>
      </main>
    </div>
  );
}
