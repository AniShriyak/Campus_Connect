@echo off
echo Syncing changes to GitHub...
git add .
git commit -m "Auto-sync update"
git push origin main
echo Done!
