
;; colors and div
(custom-set-variables
 '(ansi-color-names-vector
	 ["black" "#d55e00" "#009e73" "#f8ec59" "#0072b2" "#cc79a7" "#56b4e9" "white"])
 '(custom-enabled-themes (quote (deeper-blue)))
 '(inhibit-startup-screen t)
 '(version-control t))


(setq backup-directory-alist
      `(("." . ,(concat user-emacs-directory "backup/")))
      tramp-backup-directory-alist backup-directory-alist)

