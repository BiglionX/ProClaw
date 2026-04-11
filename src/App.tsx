import { Button, Typography, Box } from '@mui/material'

function App() {
  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom>
        🦞 Proclaw Desktop
      </Typography>
      <Typography variant="body1" color="text.secondary">
        AI-Powered Business Operating System
      </Typography>
      <Button variant="contained" sx={{ mt: 2 }}>
        Get Started
      </Button>
    </Box>
  )
}

export default App
