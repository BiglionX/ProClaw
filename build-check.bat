@echo off
cd /d d:\BigLionX\ProClaw\src-tauri
cargo check 2>&1 | findstr /C:"error" /C:"warning"
echo Build completed with above messages
pause