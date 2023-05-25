let g:go_highlight_extra_types = 1
let g:go_highlight_operators = 1
let g:go_highlight_functions = 1
let g:go_highlight_function_arguments = 1
let g:go_highlight_function_calls = 1
let g:go_highlight_types = 1
let g:go_highlight_fields = 1
let g:go_highlight_build_constraints = 1
let g:go_highlight_generate_tags = 1
let g:go_highlight_format_strings = 1
let g:go_highlight_variable_declarations = 1
let g:go_highlight_variable_assignments = 1

let g:go_list_type = "quickfix"

" Disable documentation pop up on completion
let g:go_echo_go_info = 0

" Enable format on save in vim-go
let g:go_fmt_autosave = 1
let g:go_mod_fmt_autosave = 1
let g:go_asmfmt_autosave = 1

" Disable everything else autosave in vim-go (let Ale handle this instead)
let g:go_metalinter_autosave = 0
let g:go_imports_autosave = 0
