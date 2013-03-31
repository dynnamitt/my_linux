
;; colors and div
(custom-set-variables
 '(ansi-color-names-vector
	 ["black" "#d55e00" "#009e73" "#f8ec59" "#0072b2" "#cc79a7" "#56b4e9" "white"])
 '(custom-enabled-themes (quote (deeper-blue)))
 '(inhibit-startup-screen t)
 '(icomplete-mode t)
 '(ido-enable-flex-matching t)
 '(ido-mode 'both)
 '(ido-use-virtual-buffers t)
 '(version-control t))

;; less typing
(fset 'yes-or-no-p 'y-or-n-p)

;; more sweetness
(when (>= emacs-major-version 24)
  (require 'package)
  (package-initialize)
  (add-to-list 'package-archives '("melpa" . "http://melpa.milkbox.net/packages/") t)
  )

;; move backup trash into ~/.emacs.d/backup
(setq backup-directory-alist
      `(("." . ,(concat user-emacs-directory "backup/")))
      tramp-backup-directory-alist backup-directory-alist)

