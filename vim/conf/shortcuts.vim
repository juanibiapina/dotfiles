let mapleader = "\<Space>"

" NERDTree
noremap <silent> <leader>nt :e .<Return>
noremap <silent> <leader>ns :vsplit<Return>:e .<Return>

" Vim
noremap <Leader>vr :source ~/.config/nvim/init.vim<CR>

" clear selection
noremap <Leader>nn :noh<CR>

" Ack and Ag (grep)
noremap <Leader>g<space> :Ack<Space>
noremap <Leader>gs :AckFromSearch<CR>

" Fuzzy finder
noremap <Leader>fb        :Buffers<CR>
noremap <Leader>fc        :Commands<CR>
noremap <Leader>f<Space>  :Files<CR>
noremap <Leader>ff        :GFiles<CR>
noremap <Leader>fh        :Helptags<CR>
noremap <Leader>frm       :GFiles app/models<CR>
noremap <Leader>frc       :GFiles app/controllers<CR>
noremap <Leader>frs       :GFiles app/serializers<CR>
noremap <Leader>frv       :GFiles app/views<CR>
noremap <Leader>ft        :BTags<CR>
noremap <Leader>fT        :Tags<CR>

" Files
noremap <Leader>fd        :Remove<CR>

" spell checker
noremap <Leader>sp        :setlocal spell spelllang=pt_br<CR>
noremap <Leader>se        :setlocal spell spelllang=en_us<CR>
noremap <Leader>sn        :setlocal nospell<CR>

" snipmate
noremap <Leader>sl        :SnipMateOpenSnippetFiles<CR>

" Buffer
noremap <Leader>bd :bd<CR>

" save
noremap <Leader>w :w<CR>

" reload
noremap <Leader>r<Space> :e!<CR>

" tags
noremap <Leader>tg :!ctags<CR>

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
nmap <Leader>gd <Plug>GitGutterPreviewHunk
nmap <Leader>gn <Plug>GitGutterNextHunk
nmap <Leader>gu <Plug>GitGutterUndoHunk
nmap <Leader>gp <Plug>GitGutterPrevHunk
nmap <Leader>gs :MagitOnly<CR>
nmap <Leader>gD :GitGutterDisable<CR>
nmap <Leader>gE :GitGutterEnable<CR>

" Plug
noremap <Leader>pI :PlugInstall<CR>
noremap <Leader>pU :PlugUpdate<CR>

" rubocop
noremap <Leader>l :RuboCop<CR>

" tagbar
noremap <silent> <leader>o :Tagbar<CR>
