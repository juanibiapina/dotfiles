" :h ale
let g:ale_set_loclist = 1 " By updating loclist. (On by default)
let g:ale_set_quickfix = 0 " By updating quickfix. (Off by default)
let g:ale_set_highlights = 0 " By setting error highlights.
let g:ale_set_signs = 1 " By creating signs in the sign column.
let g:ale_echo_cursor = 1 " By echoing messages based on your cursor.
let g:ale_virtualtext_cursor = 0 " By inline text based on your cursor.
let g:ale_cursor_detail = 0 " By displaying the preview based on your cursor.
let g:ale_set_balloons = 0 " By showing balloons for your mouse cursor

" disable ALE LSP features
let g:ale_disable_lsp = 1

" Set rubycop executable to use bundle
let g:ale_ruby_rubocop_executable = "bundle"
