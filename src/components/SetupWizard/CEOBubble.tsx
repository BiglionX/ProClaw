import { useEffect, useRef, useState } from 'react';
import { Avatar, Box, Typography } from '@mui/material';
import { BUBBLE_STYLES, CEO_AVATAR_COLORS } from './ceoAgentStyles';

interface CEOBubbleProps {
  text: string;
  speaker: 'ceo' | 'user';
  isTyping?: boolean;
  showAvatar?: boolean;
  onTypingComplete?: () => void;
}

/** SVG CEO Agent 头像组件（带眨眼动画） */
function CEOAvatar() {
  return (
    <Avatar
      src="/agents/secretary/avatars/default.png"
      sx={{
        width: 40,
        height: 40,
        bgcolor: CEO_AVATAR_COLORS.primary,
        flexShrink: 0,
        animation: 'ceoBlink 3s ease-in-out infinite',
        '@keyframes ceoBlink': {
          '0%, 45%, 55%, 100%': {
            transform: 'scaleY(1)',
          },
          '48%, 52%': {
            transform: 'scaleY(0.2)',
          },
        },
      }}
    />
  );
}

/** 用户头像 */
function UserAvatar() {
  return (
    <Avatar
      sx={{
        width: 32,
        height: 32,
        bgcolor: CEO_AVATAR_COLORS.secondary,
        flexShrink: 0,
      }}
    >
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>U</Typography>
    </Avatar>
  );
}

/** 打字机效果组件 */
function TypewriterText({ text, speed = 30, onComplete }: { text: string; speed?: number; onComplete?: () => void }) {
  const [displayedText, setDisplayedText] = useState('');
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setDisplayedText('');
    indexRef.current = 0;

    timerRef.current = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayedText(text.slice(0, indexRef.current + 1));
        indexRef.current++;
      } else {
        if (timerRef.current) clearInterval(timerRef.current);
        onComplete?.();
      }
    }, speed);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [text, speed, onComplete]);

  return <span>{displayedText}</span>;
}

export function CEOBubble({ text, speaker, isTyping = false, showAvatar = true, onTypingComplete }: CEOBubbleProps) {
  const isCEO = speaker === 'ceo';
  const style = isCEO ? BUBBLE_STYLES.ceo : BUBBLE_STYLES.user;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isCEO ? 'row' : 'row-reverse',
        alignItems: 'flex-start',
        gap: 1.5,
        maxWidth: '90%',
        alignSelf: style.align,
      }}
    >
      {isCEO && showAvatar && <CEOAvatar />}
      {!isCEO && showAvatar && <UserAvatar />}

      <Box
        sx={{
          bgcolor: style.bg,
          border: style.border,
          borderRadius: isCEO ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
          px: 2,
          py: 1.5,
          color: style.color,
          fontSize: '0.9rem',
          lineHeight: 1.6,
          wordBreak: 'break-word',
          backdropFilter: 'blur(10px)',
        }}
      >
        {isCEO && isTyping ? (
          <TypewriterText text={text} onComplete={onTypingComplete} />
        ) : (
          <span>{text}</span>
        )}
      </Box>
    </Box>
  );
}
