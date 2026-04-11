import { Box } from '@mui/material';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const DRAWER_WIDTH = 240;
const TOPBAR_HEIGHT = 64;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f5' }}
    >
      <TopBar />
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          ml: `${DRAWER_WIDTH}px`,
          mt: `${TOPBAR_HEIGHT}px`,
          p: 3,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
