; my dotEMaCS
; mostlty stole from http://www.aaronbedra.com/emacs.d/


; since some fancy syntaz Sneekd in
(require 'cl)

; we hate the light
(load-theme 'misterioso t)

; init
(load "package")
(package-initialize)
(add-to-list 'package-archives
             '("marmalade" . "http://marmalade-repo.org/packages/"))
(add-to-list 'package-archives
             '("melpa" . "http://melpa.milkbox.net/packages/") t)

(setq package-archive-enable-alist '(("melpa" deft magit)))

; packs
(defvar k/packages '(
		     nginx-mode
		     auto-save-buffers-enhanced
		     projectile
		     ido-vertical-mode
		     ac-slime
		     auto-complete
		;autopair
		;clojure-mode
		;clojure-test-mode
		     coffee-mode
		;erlang
		     feature-mode
		     flycheck
		     gist
		     go-mode
		;graphviz-dot-mode
		     haml-mode
		     haskell-mode
		     htmlize
		     magit
		     markdown-mode
		     marmalade
		     nodejs-repl
		     o-blog
		     org
		     paredit
		;php-mode
		     restclient
		;rvm
		     smex
		     sml-mode
		     web-mode
		     writegood-mode
		     yaml-mode)
  "Default packages")

; curl down and install
(defun k/packages-installed-p ()
  (loop for pkg in k/packages
        when (not (package-installed-p pkg)) do (return nil)
        finally (return t)))

(unless (k/packages-installed-p)
  (message "%s" "Refreshing package database...")
  (package-refresh-contents)
  (dolist (pkg k/packages)
    (when (not (package-installed-p pkg))
      (package-install pkg))))

; statup clean windows
(scroll-bar-mode -1)
(setq inhibit-splash-screen t
      initial-scratch-message nil)

; clipbard-wild x-xorg compat
(setq x-select-enable-clipboard t)

; revert when file is altered
(global-auto-revert-mode t)
 
; EOF visible
(setq-default indicate-empty-lines t)
(when (not indicate-empty-lines)
  (toggle-indicate-empty-lines))

; y over yes
(defalias 'yes-or-no-p 'y-or-n-p)

; misc NICE
(setq tab-width 2
      indent-tabs-mode nil
      make-backup-files nil
      echo-keystrokes 0.1
      use-dialog-box nil
      column-number-mode t
      visible-bell t)

(show-paren-mode t)

; CLEAN UP w C-c n(uke?) and C-x M-t (abelishioush?)
(defun untabify-buffer ()
  (interactive)
  (untabify (point-min) (point-max)))

(defun indent-buffer ()
  (interactive)
  (indent-region (point-min) (point-max)))

(defun cleanup-buffer ()
  "Perform a bunch of operations on the whitespace content of a buffer."
  (interactive)
  (indent-buffer)
  (untabify-buffer)
  (delete-trailing-whitespace))

(defun cleanup-region (beg end)
  "Remove tmux artifacts from region."
  (interactive "r")
  (dolist (re '("\\\\│\·*\n" "\W*│\·*"))
    (replace-regexp re "" nil beg end)))

(global-set-key (kbd "C-x M-t") 'cleanup-region)
(global-set-key (kbd "C-c n") 'cleanup-buffer)

(setq-default show-trailing-whitespace t)

; no temp files
(setq backup-directory-alist `((".*" . ,temporary-file-directory)))
(setq auto-save-file-name-transforms `((".*" ,temporary-file-directory t)))


; projectile active
(projectile-global-mode)

; ido settings
(ido-mode t)
(ido-vertical-mode)
(setq ido-everywhere t)
(setq ido-use-faces t)

;; smex
(setq smex-save-file (expand-file-name ".smex-items" user-emacs-directory))
(smex-initialize)

; auto-compl
(require 'auto-complete-config)
(ac-config-default)

; auto-save active
(auto-save-buffers-enhanced t)

; keybind
(global-set-key (kbd "RET") 'newline-and-indent)
(global-set-key (kbd "C-;") 'comment-or-uncomment-region)
(global-set-key (kbd "C-x g") 'magit-status)
(global-set-key (kbd "C-c C-k") 'compile)
(global-set-key (kbd "C-+") 'text-scale-increase)
(global-set-key (kbd "C--") 'text-scale-decrease)

(global-set-key (kbd "M-x") 'smex)
(global-set-key (kbd "M-X") 'smex-major-mode-commands)

;;;;;; filetypes

; Ngnix
(add-to-list 'auto-mode-alist '("*/nginx/*.conf" . nginx-mode)) 

; yml
(add-to-list 'auto-mode-alist '("\\.yml$" . yaml-mode))
(add-to-list 'auto-mode-alist '("\\.yaml$" . yaml-mode))

; www
(add-to-list 'auto-mode-alist '("\\.hbs$" . web-mode))
(add-to-list 'auto-mode-alist '("\\.handlebar$" . web-mode))

; coffee
(defun coffee-custom ()
  "coffee-mode-hook"
  (make-local-variable 'tab-width)
  (set 'tab-width 2))
(add-hook 'coffee-mode-hook 'coffee-custom)

; javascript
(defun js-custom ()
  "js-mode-hook"
  (setq js-indent-level 2))

(add-hook 'js-mode-hook 'js-custom)

; markdown
(add-to-list 'auto-mode-alist '("\\.md$" . markdown-mode))
(add-to-list 'auto-mode-alist '("\\.mdown$" . markdown-mode))
(add-hook 'markdown-mode-hook
          (lambda ()
            (visual-line-mode t)
            (writegood-mode t)
            (flyspell-mode t)))
(setq markdown-command "pandoc --smart -f markdown -t html")
;; (setq markdown-css-path (expand-file-name "markdown.css" abedra/vendor-dir))

;; ANOYING dh-make BUGFIX
(add-hook 'makefile-mode-hook
          (function (lambda ()
                      (fset 'makefile-warn-suspicious-lines 'ignore))))


;; --------------------- over n out



(custom-set-variables
 ;; custom-set-variables was added by Custom.
 ;; If you edit it by hand, you could mess it up, so be careful.
 ;; Your init file should contain only one such instance.
 ;; If there is more than one, they won't work right.
 '(column-number-mode t)
 '(show-paren-mode t))
(custom-set-faces
 ;; custom-set-faces was added by Custom.
 ;; If you edit it by hand, you could mess it up, so be careful.
 ;; Your init file should contain only one such instance.
 ;; If there is more than one, they won't work right.
 '(default ((t (:family "Ubuntu Mono" :foundry "unknown" :slant normal :weight normal :height 143 :width normal)))))
