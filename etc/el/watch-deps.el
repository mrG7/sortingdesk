;; watch-deps.el --- Automatically update dependencies
;;
;; Copyright (C) 2014 Diffeo
;;
;; Comments:
;;
;; Simple ELISP program that automatically executes a configurable shell command
;; whenever a buffer is saved whose file name is in the
;; `watch-deps-file-list'. The file name compared against in
;; `watch-deps-watch-hook' is constructed by prepending
;; `watch-deps-base-dir'. This latter variable thus refers to the project's root
;; directory.
;;
;; The buffer specified by `watch-deps-output-buffer' is shown if the executed
;; command, specified by the `watch-deps-command' variable produces any output
;; to STDERR.
;;
;; After loading this program with `load-library', issue:
;; customize-group RET
;; watch-deps RET
;;
;; Then proceed to configuring the variables `Watch Deps Base Dir´ and `Watch
;; Deps Command´, without which this program will not run. Note that the value
;; for `Watch Deps Base Dir´ does require to be wrapped within double quotes as
;; its type is directory.
;;


(defgroup watch-deps nil
  "Automatically execute a configurable shell command whenever specific buffers
are saved."
  :group 'watch-deps)

(defcustom watch-deps-base-dir nil
  "Full path of the project's root directory."
  :type 'directory
  :group 'watch-deps)

(defcustom watch-deps-file-list '("src/SortingDesk/SortingDesk.js"
                                  "src/SortingDesk/LabelBrowser.js"
                                  "src/SortingDesk/api-live.js"
                                  "src/SortingQueue/SortingQueue.js"
                                  "src/dossier.js/Dossier.js")
  "Relative path of each file to watch out for changes. Saving any of the files
in the list will result in the shell command defined in `watch-deps-command'
being executed."
  :type '(string)
  :group 'watch-deps)

(defcustom watch-deps-command nil
  "Command to run whenever dependencies need to be updated. Do not redirect
output as it is done by this program."
  :type 'string
  :group 'watch-deps)

(defvar watch-deps-output-buffer "*watch-deps*"
  "Name of the buffer that will contain any error messages thrown by the shell
  script `update-deps'.")


(defun watch-deps-watch-hook ()
  "Watches out for changes that occur in the files specified in
the list `watch-deps-file-lists'. In particular, when a file that is in the list
is saved, the command specified in `watch-deps-command' is executed. The result
of the command is shown in a separate buffer, defined by
`watch-deps-output-buffer', if an error occurs."
  (if (or (not watch-deps-base-dir)
          (not watch-deps-command))
      (message "%s"
               "error: you must first customise variables in the `watch-deps'
group.")
    (dolist (i watch-deps-file-list)
      (when (string= (buffer-file-name)
                     (expand-file-name (concat watch-deps-base-dir
                                               i)))
        (let ((output
               (shell-command-to-string (concat watch-deps-command
                                                " 1>/dev/null"))))
          ;; Ideally we should invoke `start-process' here so as to have more
          ;; control over execution of the command. As it stands, we assume an
          ;; error occurred if the command produced output, which might not
          ;; necessarily be the case; it may have terminated in error without
          ;; producing any output.
          (if (> (length output) 0)
              (let ((buffer (get-buffer-create watch-deps-output-buffer)))
                (switch-to-buffer-other-window buffer)
                (setq buffer-read-only nil)
                (erase-buffer)
                (insert output)
                (read-only-mode 1))
            (let ((msg (current-message)))
              (when (string-match "^Wrote" msg)
                (message "%s %s" msg "[dependencies updated]"))))
          (return))))))

(add-hook 'after-save-hook 'watch-deps-watch-hook)

(provide 'watch-deps)
