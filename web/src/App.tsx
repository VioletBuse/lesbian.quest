import { ClerkProvider } from '@clerk/clerk-react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { HomePage } from './components/HomePage';
import { MyAdventuresPage } from './pages/MyAdventuresPage';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  throw new Error('Missing Clerk Publishable Key');
}

function App() {
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/my-adventures" element={<MyAdventuresPage />} />
        </Routes>
      </Router>
    </ClerkProvider>
  );
}

export default App;
