import React from 'react';
import MiningApp from './mining/App';

/**
 * Main App Component
 * Container for different application pages
 *
 * Available pages:
 * - Mining: Liquidity mining and lending interface
 * - Other pages can be added here (e.g., Lending, Governance, etc.)
 */
function App() {
  return <MiningApp />;
}

export default App;
