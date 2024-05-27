; Use xbindkeys --key to find names of keys

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
  (xbindkey '(Alt space) (shell "dev rofi launch"))

  ; print screen
  (xbindkey '(Print) (shell "dev screenshot"))
  (xbindkey '(control Print) (shell "dev ai explain-screen"))

  ; ctrl+shift
  (xbindkey '(control shift e) (shell "rofi -modi emoji -show emoji"))

  ; programs
  (xbindkey '(Alt Return) "alacritty")
  (xbindkey '(F1) "vivaldi")
  (xbindkey '(F2) "alacritty --class Alacritty-Terminal --hold -e zsh -l -i -c 'dev open juanibiapina/dotfiles'")
  (xbindkey '(F3) "alacritty --class Alacritty-DigitalGarden --hold -e zsh -l -i -c 'dev tmux digitalgarden'")
  (xbindkey '(F4) "slack")
  (xbindkey '(F5) "nautilus")
  (xbindkey '(F6) (shell "dev app whatsapp"))
  (xbindkey '(F7) "spotify")

  ; switch to space mode
  ;(xbindkey-function '(control space) (lambda () (switch-mode space-mode-bindings)))
)

(define (space-xbindkey-function key fn)
  (xbindkey-function key (lambda () (switch-mode normal-mode-bindings) (fn))))

(define (space-xbindkey key command)
  (xbindkey-function key (lambda () (switch-mode normal-mode-bindings) (run-command command))))

(define (space-mode-bindings)
  ; rofi launcher
  (space-xbindkey '(space) (shell "dev rofi launcher"))

  ; dev hotkey start
  (space-xbindkey '(g) (shell "dev _hotkey start"))

  ; switch to normal mode
  (space-xbindkey-function '(Escape) (lambda () "noop")))

; start in normal mode
(switch-mode normal-mode-bindings)
