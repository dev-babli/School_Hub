# Fix: "Invalid or unexpected token" in layout.js

If you see this error in the browser console, run these steps **on the client's PC**.

## Step 1: Fix file encoding (run every time before starting)

```powershell
cd School_Hub
npm run fix:encoding
```

This removes BOM (invisible characters) that cause the error.

## Step 2: Clear cache and restart

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run dev
```

## Or use the all-in-one command

```powershell
cd School_Hub
npm run dev:safe
```

This runs the fix, then starts the dev server.

## If it still fails

1. **Move project to a shorter path without spaces**  
   Example: `C:\School_Hub` instead of `C:\Users\...\Whats App Attendance\...`

2. **Re-save files in VS Code**  
   Open `src/app/layout.tsx` → `Ctrl+Shift+P` → "Save with Encoding" → choose **UTF-8** (not "UTF-8 with BOM")

3. **Use production build**  
   ```powershell
   npm run build
   npm start
   ```
   Then open http://localhost:3000
