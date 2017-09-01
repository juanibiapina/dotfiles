let g:ctrlp_working_path_mode = 0

" disable caching
let g:ctrlp_use_caching = 0

let g:ctrlp_user_command = {
  \ 'types': {
    \ 1: ['.git', 'cd %s && git ls-files -co --exclude-standard'],
    \ },
  \ 'fallback': 'ag %s -l --nocolor -g ""'
  \ }

" search file name by default
let g:ctrlp_by_filename = 1
