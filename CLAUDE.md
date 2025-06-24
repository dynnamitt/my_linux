# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a personal dotfiles repository (`my_linux`) containing shell scripts, configuration files, and system setup automation for Linux development environments. The repository focuses on creating a consistent development setup across different Linux distributions.

## Core Architecture

### Main Installation System
- **`install`** - Master setup script with modular functions for different package managers (apt, pacman, brew)
- **Entry point**: Run with argument to trigger full installation: `./install 1`
- **Functions**: `pkgs()`, `git_conf()`, `oh_my()`, `lazyvim()`, `fix_fonts()`, `fix_tmux_deps()`

### Configuration Management
- **Dotfile symlinking**: Creates symlinks from `~/.my_linux/` to home directory
- **Key configs**: tmux.conf, vimrc, xinitrc, ghci.conf, terraformrc, _ctags, _emacs
- **Shell integration**: `sh-init.d/20-aliases` sourced by .zshrc for aliases and functions

### Utility Scripts
- **`gitlab-star-deep-clone.sh`** - Clones all starred GitLab projects using API (requires `~/.gitlab_token`)
- **`mount-iso.sh`** - Interactive ISO mounting to `~/mnt/iso/` with confirmation prompts
- **`dwm_activator`** - Minimal DWM window manager setup
- **`dwm/init`** - DWM initialization with keyboard layout and hardware management

## Common Development Commands

### System Setup
```bash
# Full system installation (installs packages, configs, fonts, etc.)
./install 1

# Individual components
source install && pkgs          # Install packages only
source install && git_conf      # Configure git only  
source install && oh_my         # Install oh-my-zsh only
source install && lazyvim       # Install LazyVim only
```

### Package Managers Supported
- **Arch/Manjaro**: pacman + yay
- **Ubuntu/Debian**: apt + pip3
- **macOS**: brew

### Key Tools Installed
- Development: neovim, tmux, git, docker, kubectl, terraform (tfenv), k9s
- CLI utilities: ripgrep, bat, fzf, tree, jq, parallel, yamllint
- Languages: python, node, zig

## Configuration Structure

### Shell Environment
- **oh-my-zsh** with powerlevel10k theme
- **Required .zshrc additions**:
  ```bash
  plugins=(git terraform fzf helm python ssh sudo kubectl aws)
  ZSH_THEME="powerlevel10k/powerlevel10k"
  source ~/.my_linux/sh-init.d/20-aliases
  ```

### Vim Configuration
- **Plugin manager**: vim-plug
- **Key plugins**: NERDTree (F9), CtrlP, vim-airline, tpope suite
- **Language support**: Python, JavaScript, Docker, Elm, CSV
- **Themes**: jellybeans, sierra, sift

### Tmux Configuration  
- **Plugin manager**: tpm
- **Theme**: catppuccin mocha
- **Key features**: vim-tmux-navigator, mouse support, vi mode
- **Prefix**: Ctrl-A (remapped from Ctrl-B)

## Security Considerations

### Token Management
- GitLab token stored in `~/.gitlab_token` (ensure proper permissions: `chmod 600`)
- Git config sets user email to `kjetil.midtlie@gmail.com`

### System Modifications
- Scripts use `sudo` for package installation and system configuration
- ISO mounting script uses `sudo mount` with user confirmation
- DWM init disables hardware devices (touchpad/trackpoint) via xinput

## Development Notes

### Multi-platform Support
The installation system detects package managers and adapts accordingly. When adding new packages:
- Add to all three package manager sections in `pkgs()` function
- Test on different distributions if possible

### Font Configuration
- Nerd Fonts are installed for terminal/editor icons
- Favorite font noted as "0xProto" in comments
- Font installation varies by package manager

### Power Management
- Arch/Manjaro users should enable powertop service for battery optimization
- GPU setup command provided for Arch: `sudo mhwd -a pci nonfree 0300`