; wrap a command to run in zsh with my dotfiles setup
(define (shell command)
  (string-append "zsh -l -i -c '" command "'"))

; switch current set of bindings to a new one
(define (switch-mode bindings)
  ; clear bindings
  (ungrab-all-keys)
  (remove-all-keys)

  ; setup new bindings
  (bindings)

  ; grab keys again
  (grab-all-keys))

(define (normal-mode-bindings)
  ; launcher
  (xbindkey '(Alt space) (shell "dev rofi launcher"))

  ; print screen
  (xbindkey '(Print) (shell "dev screenshot"))
  (xbindkey '(control Print) (shell "dev ai explain-screen"))

  ; ctrl+shift
  (xbindkey '(control shift e) (shell "rofi -modi emoji -show emoji"))

  ; programs
  (xbindkey '(Alt Return) "alacritty")
  (xbindkey '(control KP_1) "vivaldi")

  ; switch to space mode
  (xbindkey-function '(control space) (lambda () (switch-mode space-mode-bindings))))

(define (space-mode-bindings)
  ; switch to normal mode
  (xbindkey-function '(Escape) (lambda () (switch-mode normal-mode-bindings))))

; start in normal mode
(switch-mode normal-mode-bindings)
