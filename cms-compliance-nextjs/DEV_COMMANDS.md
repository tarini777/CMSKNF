# 🛠️ Development Commands Quick Reference

## ⚠️ CRITICAL: Always Work from Correct Directory

**ALWAYS run commands from:** `/Users/tarinipersonal/CMSKNF/cms-compliance-nextjs/`

## 🚀 Quick Start Commands

### Start Development Server
```bash
cd cms-compliance-nextjs && npm run dev
```

### Install Dependencies
```bash
cd cms-compliance-nextjs && npm install
```

### Build for Production
```bash
cd cms-compliance-nextjs && npm run build
```

### Run Tests
```bash
cd cms-compliance-nextjs && npm test
```

## 🔧 Common Development Tasks

### Check Current Directory
```bash
pwd
ls -la package.json  # Should exist
```

### Verify Environment
```bash
cd cms-compliance-nextjs && ls -la .env*
```

### Check Server Status
```bash
curl -s -I http://localhost:3000
```

### View Logs
```bash
cd cms-compliance-nextjs && npm run dev 2>&1 | tee dev.log
```

## 🚨 Error Prevention Checklist

Before running any npm command:
- [ ] Verify you're in `/Users/tarinipersonal/CMSKNF/cms-compliance-nextjs/`
- [ ] Check that `package.json` exists
- [ ] Ensure `node_modules` directory exists
- [ ] Verify `.env` files are present

## 📁 Directory Structure

```
CMSKNF/
├── cms-compliance-nextjs/          ← ALWAYS WORK HERE
│   ├── package.json               ← Must exist for npm commands
│   ├── node_modules/              ← Dependencies
│   ├── src/                       ← Source code
│   ├── .env                       ← Environment variables
│   └── ...
└── other-files/                   ← Don't run npm commands here
```

## 🔄 Background Process Management

### Start Server in Background
```bash
cd cms-compliance-nextjs && npm run dev &
```

### Check Running Processes
```bash
ps aux | grep "npm run dev"
```

### Stop Background Process
```bash
pkill -f "npm run dev"
```

## 🐛 Troubleshooting

### "Could not read package.json" Error
- **Cause**: Running npm command from wrong directory
- **Fix**: `cd cms-compliance-nextjs && [your-command]`

### "ENOENT" Errors
- **Cause**: Missing files or wrong directory
- **Fix**: Verify directory and file existence

### Port Already in Use
- **Fix**: `lsof -ti:3000 | xargs kill -9`

## 📋 Development Rules Summary

1. **ALWAYS** use `cd cms-compliance-nextjs &&` prefix
2. **NEVER** run npm commands from parent directory
3. **ALWAYS** verify package.json exists before commands
4. **ALWAYS** use absolute paths in file operations
5. **ALWAYS** check current directory with `pwd`

---

**Remember**: The directory issue is the #1 cause of development problems. Always verify your location first!
