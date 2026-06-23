@echo off
chcp 65001 >nul
cd /d "C:\Users\1\wuri-meditech-erp"
echo Committing and pushing UI changes...
git add components/edi/edi-inspect-detail.tsx
git commit -m "EDI inspect: separate 3 sections into cards (gaps + shadow)"
git push
echo.
echo ============================================
echo  Done. Vercel will redeploy in 1-2 minutes.
echo  You can close this window.
echo ============================================
pause
