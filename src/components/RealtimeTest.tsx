import { useEffect, useState } from 'react'
import { Box, Card, CardContent, Typography, Chip } from '@mui/material'
import { supabase } from '../lib/supabase'

export default function RealtimeTest() {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')
  const [messages, setMessages] = useState<string[]>([])

  useEffect(() => {
    // 订阅 channel
    const channel = supabase
      .channel('test-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'test_table',
        },
        (payload) => {
          console.log('Realtime event received:', payload)
          setMessages((prev) => [
            ...prev,
            `Event: ${payload.eventType} at ${new Date().toLocaleTimeString()}`,
          ])
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setStatus('connected')
          setMessages((prev) => [...prev, 'Connected to realtime channel'])
        } else if (status === 'CHANNEL_ERROR') {
          setStatus('error')
          setMessages((prev) => [...prev, 'Connection error'])
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ mr: 2 }}>
            📡 Realtime 连接状态
          </Typography>
          <Chip
            label={status}
            color={status === 'connected' ? 'success' : status === 'error' ? 'error' : 'default'}
            size="small"
          />
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          当前状态: {status === 'connected' ? '已连接' : status === 'error' ? '连接失败' : '连接中...'}
        </Typography>

        {messages.length > 0 && (
          <Box sx={{ maxHeight: 200, overflow: 'auto', bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>
            {messages.map((msg, index) => (
              <Typography key={index} variant="caption" display="block" sx={{ mb: 0.5 }}>
                {msg}
              </Typography>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
