
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

;;; backup/autosave  anti-clutter
(defvar backup-dir (expand-file-name "~/.emacs.d/backup/"))
(defvar autosave-dir (expand-file-name "~/.emacs.d/autosave/"))
(setq backup-directory-alist (list (cons ".*" backup-dir)))
(setq auto-save-list-file-prefix autosave-dir)
(setq auto-save-file-name-transforms `((".*" ,autosave-dir t)))


;; PLUGINS !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

(add-to-list 'load-path "~/.emacs.d/vendor") ;; needed?

(require 'coffee-mode)
  (setq tab-width 2)
(require 'projectile)
(require 'auto-save-buffers-enhanced)
  (auto-save-buffers-enhanced t)

