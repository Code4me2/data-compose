
# Claude Code Installation Guide for WSL Ubuntu VSCode Setup

## Prerequisites: WSL Management

First, check your WSL installations and ensure Ubuntu is running properly:

```powershell
wsl -l -v
wsl --shutdown
wsl -d ubuntu
```

## Step 1: Update System and Install Dependencies

Update your Ubuntu packages and install essential build tools required for Claude Code:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install build-essential git ripgrep
```

## Step 2: Install Node Version Manager (NVM)

Install NVM to manage Node.js versions effectively:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install --lts
nvm alias default node
```

## Step 3: Install Claude Code

Install Claude Code globally using npm:

```bash
npm install -g @anthropic-ai/claude-code
```

## Step 4: Verify Installation

Confirm that Claude Code is properly installed by checking its location and version:

```bash
which claude
```
*Should return: /home/$USER/.nvm/versions/node/v22.xx.xx/bin/claude*

```bash
claude --version
```


