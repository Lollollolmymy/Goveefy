# Goveefy Quick Reference

## Project Info
- **Name**: Goveefy
- **Purpose**: Sync Spotify album art colors to Govee H601F lights
- **License**: ISC
- **Platform**: Windows, macOS, Linux

## File Count
- **Core Files**: 6 (backend, extension, configs)
- **Documentation**: 7 markdown files
- **Scripts**: 4 (installers + launchers)
- **Dashboard**: 3 files (HTML, CSS, JS)
- **GitHub Templates**: 3 (issues + PRs)

## Quick Commands

### Setup
```bash
npm install
cp secrets.json.example secrets.json
# Edit secrets.json with your API key
```

### Run
```bash
npm start                 # or
./start.sh               # Linux/macOS
start.bat                # Windows
```

### Spicetify Extension
```bash
cp govee-sync.js ~/.config/spicetify/Extensions/
spicetify config extensions govee-sync.js
spicetify apply
```

### Git
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_REPO_URL
git push -u origin main
```

## Ports
- **Dashboard**: http://localhost:3000
- **WebSocket**: ws://localhost:8080

## Key Files
- `govee-backend.js` - Main server
- `govee-sync.js` - Spicetify extension
- `secrets.json` - Your config (not committed)
- `public/` - Dashboard files

## Links
- Dashboard: http://localhost:3000
- Govee Developer: https://developer.govee.com/
- Spicetify Docs: https://spicetify.app/docs/

## Common Issues
1. **Backend won't start**: Check secrets.json exists
2. **Extension not working**: Verify Spicetify installation
3. **Lights not updating**: Check API key and device IDs
4. **Port in use**: Change ports in govee-backend.js

## Support Files
- `README.md` - Full documentation
- `SETUP.md` - Detailed installation
- `GITHUB_UPLOAD.md` - Upload instructions
- `CHECKLIST.md` - Pre-upload verification

---

Ready to sync! 🎵 → 🎨 → 💡
