# Goveefy Project Structure

```
goveefy/
├── .github/                      # GitHub-specific files
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md        # Bug report template
│   │   └── feature_request.md   # Feature request template
│   └── pull_request_template.md # PR template
├── public/                       # Dashboard frontend files
│   ├── index.html               # Dashboard HTML
│   ├── style.css                # Dashboard styles
│   └── app.js                   # Dashboard client-side logic
├── .editorconfig                # Editor configuration
├── .gitignore                   # Git ignore rules
├── album-settings.json          # Album-specific color adjustments
├── CODE_OF_CONDUCT.md          # Community guidelines
├── CONTRIBUTING.md             # Contribution guidelines
├── govee-backend.js            # Main backend server
├── govee-sync.js               # Spicetify extension
├── install.ps1                 # Windows installer
├── install.sh                  # Linux/macOS installer
├── LICENSE                     # Project license
├── package.json                # npm dependencies and scripts
├── PROJECT_STRUCTURE.md        # This file
├── README.md                   # Project documentation
├── secrets.json.example        # Configuration template
├── start.bat                   # Windows start script
└── start.sh                    # Linux/macOS start script
```

## File Descriptions

### Core Backend Files
- **govee-backend.js**: Node.js server that receives album art from Spotify, extracts dominant colors, and controls Govee lights
- **govee-sync.js**: Spicetify extension that runs in Spotify client and sends track info to the backend

### Configuration Files
- **secrets.json** (not in repo): Contains your Govee API key and device IDs
- **secrets.json.example**: Template for secrets.json
- **album-settings.json**: Stores per-album color adjustment settings

### Dashboard Files (public/)
- **index.html**: Dashboard web interface
- **style.css**: Dashboard styling
- **app.js**: Dashboard client-side JavaScript for controls and real-time updates

### Installation Scripts
- **install.sh**: Automated setup for Linux/macOS
- **install.ps1**: Automated setup for Windows (PowerShell)
- **start.sh**: Quick start script for Linux/macOS
- **start.bat**: Quick start script for Windows

### Documentation
- **README.md**: Main project documentation with setup instructions
- **CONTRIBUTING.md**: How to contribute to the project
- **CODE_OF_CONDUCT.md**: Community guidelines
- **LICENSE**: Project license (ISC)

### Configuration
- **.gitignore**: Specifies files to exclude from Git
- **.editorconfig**: Ensures consistent code formatting across editors
- **package.json**: npm dependencies and project metadata

## Key Directories

### `/public`
Contains all frontend dashboard files. These are served statically by the Express server.

### `/.github`
Contains GitHub-specific templates and workflows for better project management.

## Important Notes

1. **secrets.json is never committed** - it's in .gitignore
2. **node_modules is never committed** - install via `npm install`
3. **Dashboard runs on port 3000** by default
4. **WebSocket runs on port 8080** by default
5. **All scripts should be executable** (`chmod +x *.sh` on Unix systems)
