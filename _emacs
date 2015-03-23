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

 
; file endings visible
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

; no temp files
(setq backup-directory-alist `((".*" . ,temporary-file-directory)))
(setq auto-save-file-name-transforms `((".*" ,temporary-file-directory t)))


; projectile active
(projectile-global-mode)

; ido settings
(ido-mode t)
(ido-vertical-mode)
;; (setq ido-everywhere t)(setq ido-use-faces t)

;; smex
(setq smex-save-file (expand-file-name ".smex-items" user-emacs-directory))
(smex-initialize)

; keybind
(global-set-key (kbd "RET") 'newline-and-indent)
(global-set-key (kbd "C-;") 'comment-or-uncomment-region)
(global-set-key (kbd "C-x g") 'magit-status)
(global-set-key (kbd "C-c C-k") 'compile)
(global-set-key (kbd "C-+") 'text-scale-increase)
(global-set-key (kbd "C--") 'text-scale-decrease)

(global-set-key (kbd "M-x") 'smex)
(global-set-key (kbd "M-X") 'smex-major-mode-commands)		

