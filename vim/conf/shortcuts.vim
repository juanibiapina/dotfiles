let mapleader = "\<Space>"

noremap          <Leader>bd        :bd<CR>
noremap          <Leader>ec        :Econtroller<space>
noremap          <Leader>em        :Emodel<space>
noremap          <Leader>f<Space>  :Files<CR>
noremap          <Leader>fb        :Buffers<CR>
noremap          <Leader>fc        :Commands<CR>
noremap          <Leader>fd        :Remove<CR>
noremap          <Leader>ff        :GFiles<CR>
noremap          <Leader>fh        :Helptags<CR>
noremap          <Leader>frc       :GFiles app/controllers<CR>
noremap          <Leader>frm       :GFiles app/models<CR>
noremap          <Leader>frp       :GFiles app/policies<CR>
noremap          <Leader>frs       :GFiles app/serializers<CR>
noremap          <Leader>frv       :GFiles app/views<CR>
noremap          <Leader>fsf       :GFiles spec/factories<CR>
noremap          <Leader>ft        :BTags<CR>
noremap          <Leader>fT        :Tags<CR>
noremap          <Leader>g<space>  :Ack<Space>
nmap             <Leader>gb        :Gblame<CR>
nmap             <Leader>ga        <Plug>GitGutterStageHunk
nmap             <Leader>gd        <Plug>GitGutterPreviewHunk
nmap             <Leader>gn        <Plug>GitGutterNextHunk
nmap             <Leader>gu        <Plug>GitGutterUndoHunk
nmap             <Leader>gp        <Plug>GitGutterPrevHunk
nmap             <Leader>gs        :MagitOnly<CR>
nmap             <Leader>gB        :Gbrowse<CR>
nmap             <Leader>gD        :GitGutterDisable<CR>
nmap             <Leader>gE        :GitGutterEnable<CR>
noremap          <Leader>l         :RuboCop<CR>
noremap          <Leader>nn        :noh<CR>
noremap <silent> <leader>ns        :vsplit<Return>:e .<Return>
noremap <silent> <leader>nt        :e .<Return>
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

noremap <silent> <Leader>Tg        :!ctags<CR>
noremap <silent> <leader>Tb        :Tagbar<CR>
