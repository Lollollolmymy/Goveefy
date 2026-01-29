# Goveefy Installer for Windows
# Installs dependencies, generates config with multiple devices, and optionally sets up backend auto-start
# Run: powershell -ExecutionPolicy Bypass -File install.ps1

$ErrorActionPreference = "Stop"

# Colors
function Write-Success { Write-Host "✅ $args" -ForegroundColor Green }
function Write-Error-Custom { Write-Host "❌ $args" -ForegroundColor Red; exit 1 }
function Write-Warning-Custom { Write-Host "⚠️  $args" -ForegroundColor Yellow }
function Write-Info { Write-Host "📋 $args" -ForegroundColor Blue }
function Write-Prompt { Write-Host "❯ $args" -ForegroundColor Cyan }

# Banner
Clear-Host
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🎨 Goveefy Installer — Windows" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Node.js
Write-Info "Checking prerequisites..."
try {
    $nodeVersion = node --version
    Write-Success "Node.js $nodeVersion found"
} catch {
    Write-Error-Custom "Node.js not found. Please install from https://nodejs.org/"
}

# Step 2: Install dependencies
Write-Host ""
Write-Info "Installing npm dependencies..."
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "npm install failed"
}
Write-Success "Dependencies installed"

# Step 3: Generate secrets.json with interactive device configuration
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔑 Govee API Configuration" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$secretsPath = Join-Path $PSScriptRoot "secrets.json"

if (Test-Path $secretsPath) {
    Write-Warning-Custom "secrets.json already exists!"
    $recreate = Read-Host "   Do you want to recreate it? (y/n)"
    if ($recreate -ne "y" -and $recreate -ne "Y") {
        Write-Info "Keeping existing secrets.json"
        $skipSecrets = $true
    } else {
        Remove-Item $secretsPath
        Write-Info "Removed old secrets.json"
        $skipSecrets = $false
    }
} else {
    $skipSecrets = $false
}

if (-not $skipSecrets) {
    Write-Host "📝 Get your API key from: https://developer.govee.com/" -ForegroundColor Yellow
    Write-Host ""
    $apiKey = Read-Host "   Enter your Govee API key"
    
    if ([string]::IsNullOrWhiteSpace($apiKey)) {
        Write-Warning-Custom "API key is empty. You can add it to secrets.json later."
        $apiKey = ""
    }
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "💡 Adding Govee Devices" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "You can add multiple Govee devices to control."
    Write-Host ""
    
    # Array to store devices
    $devices = @()
    $deviceCount = 0
    
    do {
        $deviceCount++
        
        Write-Host "━━━ Device #$deviceCount ━━━" -ForegroundColor Green
        Write-Host ""
        
        # Get device ID
        do {
            $deviceId = Read-Host "   Device ID (e.g., AA:BB:CC:DD:EE:FF:GG:HH)"
            if ([string]::IsNullOrWhiteSpace($deviceId)) {
                Write-Warning-Custom "Device ID cannot be empty"
            }
        } while ([string]::IsNullOrWhiteSpace($deviceId))
        
        # Get device SKU
        Write-Host ""
        Write-Host "   Common SKUs: H601F, H6076, H6199, H7021, H7022"
        $deviceSku = Read-Host "   Device SKU (default: H601F)"
        if ([string]::IsNullOrWhiteSpace($deviceSku)) {
            $deviceSku = "H601F"
        }
        
        # Get device name
        Write-Host ""
        $deviceName = Read-Host "   Device Name (e.g., Living Room)"
        if ([string]::IsNullOrWhiteSpace($deviceName)) {
            $deviceName = "Govee Device $deviceCount"
        }
        
        # Add device to array
        $device = @{
            device = $deviceId
            sku = $deviceSku
            name = $deviceName
        }
        $devices += $device
        
        Write-Success "Added: $deviceName ($deviceSku)"
        Write-Host ""
        
        # Ask if user wants to add more devices
        $addMore = Read-Host "   Add another device? (y/n)"
        Write-Host ""
    } while ($addMore -eq "y" -or $addMore -eq "Y")
    
    # Create secrets.json
    $secretsContent = @{
        GOVEE_API_KEY = $apiKey
        DEVICES = $devices
    }
    
    $secretsJson = $secretsContent | ConvertTo-Json -Depth 10
    $secretsJson | Out-File -FilePath $secretsPath -Encoding UTF8
    
    Write-Success "secrets.json created with $deviceCount device(s)"
    Write-Host ""
    Write-Host "📄 Configuration saved to: $secretsPath" -ForegroundColor Green
}

# Step 4: Generate album-settings.json
Write-Host ""
Write-Info "Initializing album settings..."
$albumPath = Join-Path $PSScriptRoot "album-settings.json"
if (Test-Path $albumPath) {
    Write-Warning-Custom "album-settings.json already exists, skipping"
} else {
    "{}" | Out-File -FilePath $albumPath -Encoding UTF8
    Write-Success "album-settings.json created"
}

# Step 5: Auto-start setup
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🚀 Auto-start Configuration" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Windows detected. You can:"
Write-Host "   1. Add to Startup folder (simple)"
Write-Host "   2. Use Task Scheduler (advanced)"
Write-Host ""
$autoStart = Read-Host "   Enable auto-start on login? (y/n)"

if ($autoStart -eq "y" -or $autoStart -eq "Y") {
    Write-Host ""
    Write-Host "   Choose auto-start method:"
    Write-Host "   1. Startup folder (runs in visible window)"
    Write-Host "   2. Task Scheduler (runs in background)"
    Write-Host ""
    $method = Read-Host "   Enter choice (1 or 2)"
    
    if ($method -eq "1") {
        # Startup folder method
        $startupFolder = [Environment]::GetFolderPath("Startup")
        $shortcutPath = Join-Path $startupFolder "Goveefy.lnk"
        $targetPath = Join-Path $PSScriptRoot "start.bat"
        
        $WScriptShell = New-Object -ComObject WScript.Shell
        $shortcut = $WScriptShell.CreateShortcut($shortcutPath)
        $shortcut.TargetPath = $targetPath
        $shortcut.WorkingDirectory = $PSScriptRoot
        $shortcut.Save()
        
        Write-Success "Created startup shortcut at: $shortcutPath"
        Write-Host ""
        Write-Host "   To remove: Delete the shortcut from your Startup folder"
        
    } elseif ($method -eq "2") {
        # Task Scheduler method
        $taskName = "Goveefy Backend"
        $nodePath = (Get-Command node).Path
        $backendPath = Join-Path $PSScriptRoot "govee-backend.js"
        
        $action = New-ScheduledTaskAction -Execute $nodePath -Argument "`"$backendPath`"" -WorkingDirectory $PSScriptRoot
        $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
        $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
        
        try {
            Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Goveefy Spotify to Govee Backend" -Force | Out-Null
            Write-Success "Created Task Scheduler task: $taskName"
            Write-Host ""
            Write-Host "   To manage: Open Task Scheduler and look for 'Goveefy Backend'"
            Write-Host "   To disable: Right-click the task → Disable"
            Write-Host "   To remove: Right-click the task → Delete"
        } catch {
            Write-Warning-Custom "Failed to create Task Scheduler task. You may need to run as Administrator."
        }
    }
}

# Step 6: Summary
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:"
Write-Host ""
Write-Host "  1. " -NoNewline
Write-Host "Verify your configuration:" -ForegroundColor Green
Write-Host "     type secrets.json"
Write-Host ""
Write-Host "  2. " -NoNewline
Write-Host "Install Spicetify extension:" -ForegroundColor Green
Write-Host "     Copy govee-sync.js to: $env:APPDATA\spicetify\Extensions\"
Write-Host "     spicetify config extensions govee-sync.js"
Write-Host "     spicetify apply"
Write-Host ""
Write-Host "  3. " -NoNewline
Write-Host "Start the backend:" -ForegroundColor Green
Write-Host "     .\start.bat"
Write-Host "     or: npm start"
Write-Host ""
Write-Host "Dashboard: " -NoNewline -ForegroundColor Cyan
Write-Host "http://localhost:3000"
Write-Host "WebSocket: " -NoNewline -ForegroundColor Cyan
Write-Host "ws://localhost:8080"
Write-Host ""
Write-Host "Enjoy your synchronized lighting! 🎵 → 🎨 → 💡" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
