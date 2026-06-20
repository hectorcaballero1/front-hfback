import { useState } from 'react';
import { TenantProvider } from './context/TenantContext';
import Layout from './components/layout/Layout';
import EnVivo from './components/views/EnVivo';
import Procesados from './components/views/Procesados';
import Bandeja from './components/views/Bandeja';
import Corpus from './components/views/Corpus';
import Landing from './components/views/Landing';
import type { View } from './types';

export default function App() {
  const [view, setView] = useState<View>('landing');
  const [pollingStatus, setPollingStatus] = useState<'idle' | 'polling' | 'error'>('idle');

  if (view === 'landing') {
    return <Landing onEnter={() => setView('envivo')} />;
  }

  return (
    <TenantProvider>
      <Layout view={view} setView={setView} pollingStatus={pollingStatus}>
        {view === 'envivo'     && <EnVivo onPollingStatus={setPollingStatus} />}
        {view === 'bandeja'    && <Bandeja />}
        {view === 'corpus'     && <Corpus />}
        {view === 'procesados' && <Procesados />}
      </Layout>
    </TenantProvider>
  );
}
