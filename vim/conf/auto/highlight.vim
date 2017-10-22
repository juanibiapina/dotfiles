let g:base03  = "#002b36"
let g:base02  = "#073642"
let g:base01  = "#586e75"
let g:base00  = "#657b83"
let g:base0   = "#839496"
let g:base1   = "#93a1a1"
let g:base2   = "#eee8d5"
let g:base3   = "#fdf6e3"

let g:yellow  = "#b58900"
let g:orange  = "#cb4b16"
let g:red     = "#dc322f"
let g:magenta = "#d33682"
let g:violet  = "#6c71c4"
let g:blue    = "#268bd2"
let g:cyan    = "#2aa198"
let g:green   = "#859900"

function! g:SetHighlight(group, color)
  exec "highlight! " . a:group . " guifg=" . a:color
endfunction

" Javascript
call SetHighlight("Noise", g:violet)
call SetHighlight("jsVariableDef", g:blue)
"call SetHighlight("jsObjectProp", g:yellow)
"call SetHighlight("jsObjectKey", g:yellow)
call SetHighlight("jsFuncCall", g:green)
