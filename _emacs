
(load-theme 'misterioso t)

(load "package")
(package-initialize)
(add-to-list 'package-archives
             '("marmalade" . "http://marmalade-repo.org/packages/"))
(add-to-list 'package-archives
             '("melpa" . "http://melpa.milkbox.net/packages/") t)

(setq package-archive-enable-alist '(("melpa" deft magit)))


(projectile-global-mode)
(ido-mode)
(ido-vertical-mode)
;; (setq ido-everywhere t)			

(scroll-bar-mode -1)
(setq inhibit-splash-screen t
      initial-scratch-message nil)

;; Don't clutter up directories with files~
(setq backup-directory-alist `(("." . ,(expand-file-name
                                    (concat "~/" ".emacsbak")))))

;; Don't clutter with #files either
(setq auto-save-file-name-transforms
      `((".*" ,(expand-file-name (concat "~/" ".emacsbak")))))

;; PLUGINS !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

(add-to-list 'load-path "~/.emacs.d/vendor")
(require 'coffee-mode)
(require 'projectile)
(require 'auto-save-buffers-enhanced)
  (auto-save-buffers-enhanced t)

