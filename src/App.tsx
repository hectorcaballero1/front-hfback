import { useState } from 'react';
import { TenantProvider } from './context/TenantContext';
import { IngestaProvider } from './context/IngestaContext';
import Layout from './components/layout/Layout';
import Ingesta from './components/views/Ingesta';
import Consultas from './components/views/Consultas';
import Corpus from './components/views/Corpus';
import Landing from './components/views/Landing';
import type { View } from './types';

export default function App() {
  const [view, setView] = useState<View>('landing');

  if (view === 'landing') {
    return <Landing onEnter={() => setView('ingesta')} />;
  }

  return (
    <TenantProvider>
      <IngestaProvider>
        <Layout view={view} setView={setView}>
          {view === 'ingesta'   && <Ingesta />}
          {view === 'consultas' && <Consultas />}
          {view === 'corpus'    && <Corpus />}
        </Layout>
      </IngestaProvider>
    </TenantProvider>
  );
}
