import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Button, Card, CardContent } from '@mui/material'
import { useAuthStore } from '../lib/authStore'
import RealtimeTest from '../components/RealtimeTest'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, logout, checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  if (!user) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography>加载中...</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 4 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            👋 欢迎回来!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            邮箱: {user.email}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            用户 ID: {user.id}
          </Typography>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            🦞 Proclaw Desktop
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            AI-Powered Business Operating System
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            这是 Phase 0 Week 2 的演示页面。接下来我们将继续开发:
          </Typography>
          <ul style={{ paddingLeft: 20 }}>
            <li>Phase 0 Week 3: 本地数据库 (SQLite)</li>
            <li>Phase 0 Week 4: 数据同步引擎</li>
            <li>Phase 1: MVP 核心功能开发</li>
          </ul>
          
          <Button
            variant="contained"
            color="error"
            onClick={handleLogout}
            sx={{ mt: 2 }}
          >
            退出登录
          </Button>
        </CardContent>
      </Card>

      <RealtimeTest />
    </Box>
  )
}
