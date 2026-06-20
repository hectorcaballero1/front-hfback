import { useState } from 'react';
import { TenantProvider } from './context/TenantContext';
import Layout from './components/layout/Layout';
import EnVivo from './components/views/EnVivo';
import Procesados from './components/views/Procesados';
import Bandeja from './components/views/Bandeja';
import type { View } from './types';

export default function App() {
  const [view, setView] = useState<View>('envivo');
  const [pollingStatus, setPollingStatus] = useState<'idle' | 'polling' | 'error'>('idle');

  return (
    <TenantProvider>
      <Layout view={view} setView={setView} pollingStatus={pollingStatus}>
        {view === 'envivo' && <EnVivo onPollingStatus={setPollingStatus} />}
        {view === 'procesados' && <Procesados />}
        {view === 'bandeja' && <Bandeja />}
      </Layout>
    </TenantProvider>
  );
}
