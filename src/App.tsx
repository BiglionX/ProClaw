import { Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { HashRouter, Routes } from 'react-router-dom';
import LoginDialog from './components/Auth/LoginDialog';
import IncomingCallDialog from './components/Call/IncomingCallDialog';
import { renderAppRoutes } from './config/routes';

function App() {
  return (
    <HashRouter>
      <IncomingCallDialog />
      <LoginDialog />
      <Suspense fallback={
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <CircularProgress />
        </Box>
      }>
        <Routes>
          {renderAppRoutes()}
        </Routes>
      </Suspense>
    </HashRouter>
  );
}

export default App;
