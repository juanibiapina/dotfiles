let mapleader = "\<Space>"

noremap          <Leader>ah        :SidewaysJumpLeft<CR>
noremap          <Leader>al        :SidewaysJumpRight<CR>
noremap          <Leader>aH        :SidewaysLeft<CR>
noremap          <Leader>aL        :SidewaysRight<CR>
noremap          <Leader>bd        :bd<CR>
noremap          <Leader>bc        :let @*=expand("%")<CR>
noremap          <Leader>ec        :Econtroller<space>
noremap          <Leader>em        :Emodel<space>
noremap          <Leader>et        :Goyo<CR>:WP<CR>
noremap          <Leader>f<Space>  :Files<CR>
noremap          <Leader>fb        :Buffers<CR>
noremap          <Leader>fc        :Commands<CR>
noremap          <Leader>fd        :Remove<CR>
noremap          <Leader>ff        :Files<CR>
noremap          <Leader>fh        :Helptags<CR>
noremap          <Leader>frc       :Files app/controllers<CR>
noremap          <Leader>frm       :Files app/models<CR>
noremap          <Leader>frp       :Files app/policies<CR>
noremap          <Leader>frs       :Files app/serializers<CR>
noremap          <Leader>frv       :Files app/views<CR>
noremap          <Leader>fsf       :Files spec/factories<CR>
noremap          <Leader>ft        :BTags<CR>
noremap          <Leader>fT        :Tags<CR>
noremap          <Leader>g<space>  :Ack!<Space>
nmap             <Leader>gb        :Gblame<CR>
nmap             <Leader>ga        <Plug>GitGutterStageHunk
nmap             <Leader>gd        <Plug>GitGutterPreviewHunk
nmap             <Leader>gn        <Plug>GitGutterNextHunk
nmap             <Leader>gu        <Plug>GitGutterUndoHunk
nmap             <Leader>gp        <Plug>GitGutterPrevHunk
nmap             <Leader>gs        :Gstatus<CR>
nmap             <Leader>gB        :Gbrowse<CR>
nmap             <Leader>gD        :GitGutterDisable<CR>
nmap             <Leader>gE        :GitGutterEnable<CR>
noremap          <Leader>l         :RuboCop<CR>
noremap          <leader>nf        :LightTreeFind<CR>
noremap          <Leader>nn        :noh<CR>
noremap <silent> <leader>ns        :vsplit<CR>:LightTree<CR>
noremap <silent> <leader>nt        :LightTree<CR>
noremap          <Leader>pI        :PlugInstall<CR>
noremap          <Leader>pU        :PlugUpdate<CR>
noremap          <Leader>r<Space>  :e!<CR>
noremap          <Leader>sl        :SnipMateOpenSnippetFiles<CR>
noremap          <Leader>se        :setlocal spell spelllang=en_us<CR>
noremap          <Leader>sn        :setlocal nospell<CR>
noremap          <Leader>sp        :setlocal spell spelllang=pt_br<CR>
noremap          <Leader>ts        :AS<CR>
noremap          <Leader>tt        :A<CR>
noremap          <Leader>tv        :AV<CR>
noremap          <Leader>vc        :Vcontroller<space>
noremap          <Leader>vm        :Vmodel<space>
noremap          <Leader>vr        :source ~/.config/nvim/init.vim<CR>
noremap          <Leader>w         :w<CR>

noremap          <Leader>Tl        :OnlineThesaurusCurrentWord<CR>
noremap <silent> <leader>Tb        :Tagbar<CR>
noremap <silent> <Leader>Tg        :!ctags<CR>

map <F10> :echo "hi<" . synIDattr(synID(line("."),col("."),1),"name") . '> trans<'
\ . synIDattr(synID(line("."),col("."),0),"name") . "> lo<"
\ . synIDattr(synIDtrans(synID(line("."),col("."),1)),"name") . ">"<CR>

map <F9> :so $VIMRUNTIME/syntax/hitest.vim<CR>

omap aa <Plug>SidewaysArgumentTextobjA
xmap aa <Plug>SidewaysArgumentTextobjA
omap ia <Plug>SidewaysArgumentTextobjI
xmap ia <Plug>SidewaysArgumentTextobjI

nnoremap * :let @/='\<<C-R>=expand("<cword>")<CR>\>'<CR>:set hls<CR>
