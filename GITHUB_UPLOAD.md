# How to Upload This Project to GitHub

## Step 1: Create a Repository on GitHub

1. Go to [https://github.com/new](https://github.com/new)
2. Enter a name (e.g. `marketing-capsule-erp`)
3. Choose **Private** or **Public**
4. **Do NOT** initialize with README, .gitignore, or license (we already have these)
5. Click **Create repository**

## Step 2: Push from Your Terminal

Run these commands in order (replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your actual values):

```bash
# Initialize git (already done if you see this)
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit: Marketing Capsule ERP & Website"

# Add GitHub as remote (use YOUR repo URL from Step 1)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 3: On Another Device

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
npm install
cd functions && npm install && cd ..
npm run dev
```

## Daily Workflow (Sync Between Devices)

**After making changes on this device:**
```bash
git add .
git commit -m "Describe your changes"
git push
```

**On the other device, before editing:**
```bash
git pull
```
