#!/bin/bash

# Setup script for hourly sync cron job
# Run: chmod +x scripts/setup-cron.sh && ./scripts/setup-cron.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"

# Create logs directory
mkdir -p "$LOG_DIR"

# Create the sync wrapper script
cat > "$SCRIPT_DIR/run-sync.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/.."
export PATH="$PATH:/usr/local/bin:/opt/homebrew/bin"

# Load nvm if available
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Run the sync
npx tsx scripts/sync-scripts.ts >> logs/sync.log 2>&1

# Keep only last 1000 lines of log
tail -1000 logs/sync.log > logs/sync.log.tmp && mv logs/sync.log.tmp logs/sync.log
EOF

chmod +x "$SCRIPT_DIR/run-sync.sh"

echo "Sync wrapper created at: $SCRIPT_DIR/run-sync.sh"
echo ""
echo "To set up hourly sync, add this to your crontab:"
echo ""
echo "  0 * * * * $SCRIPT_DIR/run-sync.sh"
echo ""
echo "To edit crontab, run: crontab -e"
echo ""
echo "Alternatively, run manually:"
echo "  $SCRIPT_DIR/run-sync.sh"
echo ""

# Ask if user wants to add to crontab automatically
read -p "Add hourly sync to crontab now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Check if already in crontab
    if crontab -l 2>/dev/null | grep -q "run-sync.sh"; then
        echo "Cron job already exists. Skipping."
    else
        # Add to crontab
        (crontab -l 2>/dev/null; echo "0 * * * * $SCRIPT_DIR/run-sync.sh") | crontab -
        echo "✅ Hourly sync added to crontab!"
    fi
fi

echo ""
echo "Setup complete! Logs will be written to: $LOG_DIR/sync.log"
