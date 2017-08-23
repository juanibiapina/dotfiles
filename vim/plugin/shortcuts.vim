let mapleader = "\<Space>"

" NERDTree
noremap <silent> <leader>nt :NERDTreeToggle<Return>
noremap <silent> <leader>nf :NERDTreeFind<Return>

" clear selection
noremap <Leader>nn :noh<CR>

" Ack and Ag (grep)
noremap <Leader>g<space> :Ack<Space>
noremap <Leader>gs :AckFromSearch<CR>

" CtrlP and CtrlP Rails
noremap <Leader>ff        :CtrlP<CR>
noremap <Leader>f<Space>  :CtrlP<CR>
noremap <Leader>fb        :CtrlPBuffer<CR>
noremap <Leader>fm        :CtrlPModel<CR>
noremap <Leader>fc        :CtrlPController<CR>
noremap <Leader>fv        :CtrlPView<CR>
noremap <Leader>fT        :CtrlPTag<CR>
noremap <Leader>ft        :CtrlPBufTag<CR>

" Files
noremap <Leader>fd        :Remove<CR>

" spell checker
noremap <Leader>sp        :setlocal spell spelllang=pt_br<CR>
noremap <Leader>se        :setlocal spell spelllang=en_us<CR>
noremap <Leader>sn        :setlocal nospell<CR>

" snipmate
noremap <Leader>sl        :SnipMateOpenSnippetFiles<CR>

" Buffer
noremap <C-q> :bd<CR>

" save
noremap <Leader>w :w<CR>

" reload
noremap <Leader>r :e!<CR>

" rails
noremap <Leader>tt :A<CR>
noremap <Leader>t<Space> :A<CR>
noremap <Leader>ts :AS<CR>
noremap <Leader>tv :AV<CR>
noremap <Leader>em :Emodel<space>
noremap <Leader>ec :Econtroller<space>
noremap <Leader>vm :Vmodel<space>
noremap <Leader>vc :Vcontroller<space>

" git
nmap <Leader>ga <Plug>GitGutterStageHunk
nmap <Leader>gu <Plug>GitGutterUndoHunk
nmap <Leader>gp <Plug>GitGutterPreviewHunk
nmap ]c <Plug>GitGutterNextHunk
nmap [c <Plug>GitGutterPrevHunk

" rubocop
noremap <Leader>l :RuboCop<CR>

" tagbar
noremap <silent> <leader>o :Tagbar<CR>
