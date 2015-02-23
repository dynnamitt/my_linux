
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

(scroll-bar-mode -1)
(setq inhibit-splash-screen t
      initial-scratch-message nil)




(add-to-list 'load-path "~/.emacs.d/vendor")
(require 'coffee-mode)
(require 'projectile)

