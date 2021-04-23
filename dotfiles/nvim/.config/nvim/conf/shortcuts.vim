let mapleader = "\<Space>"
let maplocalleader = "\<Space>"

noremap <silent> <Leader><Leader> :Shortcuts<Return>

Shortcut Jump to argument on the left
      \ noremap          <Leader>ah        :SidewaysJumpLeft<CR>
Shortcut Jump to argument on the right
      \ noremap          <Leader>al        :SidewaysJumpRight<CR>
Shortcut Move current argument to the left
      \ noremap          <Leader>aH        :SidewaysLeft<CR>
Shortcut Move current argument to the right
      \ noremap          <Leader>aL        :SidewaysRight<CR>
Shortcut buffer: Copy current filename to clipboard
      \ noremap          <Leader>bc        :let @+=expand("%")<CR>
Shortcut buffer: Wipeout current buffer keeping window layout
      \ noremap          <Leader>bd        :Bwipeout<CR>
Shortcut buffer: Switch to last used buffer
      \ noremap          <Leader>bl        :b#<CR>
Shortcut buffer: Close all other buffers
      \ noremap          <Leader>bo        :%bd \| :e #<CR>
Shortcut Wipeout current buffer
      \ noremap          <Leader>bD        :bwipeout<CR>
Shortcut Select system clipboard (visual mode)
      \ vnoremap         <leader>cb        "+
Shortcut Select system clipboard (normal mode)
      \ noremap          <leader>cb        "+
Shortcut List buffers
      \ noremap          <Leader>fb        :Buffers<CR>
Shortcut List commands
      \ noremap          <Leader>fc        :Commands<CR>
Shortcut Delete current file and buffer
      \ noremap          <Leader>fd        :Remove<CR>
Shortcut List files
      \ noremap          <Leader>ff        :Files<CR>
Shortcut List help tags
      \ noremap          <Leader>fh        :Helptags<CR>
Shortcut List rails controllers
      \ noremap          <Leader>frc       :Files app/controllers<CR>
Shortcut List rails models
      \ noremap          <Leader>frm       :Files app/models<CR>
Shortcut List rails policies
      \ noremap          <Leader>frp       :Files app/policies<CR>
Shortcut List rails serializers
      \ noremap          <Leader>frs       :Files app/serializers<CR>
Shortcut List rails views
      \ noremap          <Leader>frv       :Files app/views<CR>
Shortcut List rspec factories
      \ noremap          <Leader>fsf       :Files spec/factories<CR>
Shortcut List tags for current buffer
      \ noremap          <Leader>ft        :BTags<CR>
Shortcut List tags
      \ noremap          <Leader>fT        :Tags<CR>
Shortcut Grep for word under cursor
      \ noremap          <Leader>g<space>  :Ack!<Space>
Shortcut Activate git blame for current buffer
      \ nmap             <Leader>gb        :Git blame<CR>
Shortcut Stage current hunk
      \ nmap             <Leader>ga        <Plug>(GitGutterStageHunk)
Shortcut Preview changes in current hunk
      \ nmap             <Leader>gd        <Plug>(GitGutterPreviewHunk)
Shortcut Jump to next hunk
      \ nmap             <Leader>gn        <Plug>(GitGutterNextHunk)
Shortcut Undo changes in current hunk
      \ nmap             <Leader>gu        <Plug>(GitGutterUndoHunk)
Shortcut Jump to previous hunk
      \ nmap             <Leader>gp        <Plug>(GitGutterPrevHunk)
Shortcut Git: load modified files into quickfix
      \ nmap             <Leader>gq        :GLoadChanged<CR>
Shortcut Browse current branch in git repository
      \ nmap             <Leader>gr        :silent ! hub browse<CR>
Shortcut Run git status
      \ nmap             <Leader>gs        :Gstatus<CR>
Shortcut Browse current selection in git repository
      \ vnoremap         <Leader>gB        :Gbrowse<CR>
Shortcut Browse current file in git repository
      \ nmap             <Leader>gB        :Gbrowse<CR>
Shortcut Disable GitGutter
      \ nmap             <Leader>gD        :GitGutterDisable<CR>
Shortcut Enable GitGutter
      \ nmap             <Leader>gE        :GitGutterEnable<CR>
Shortcut Lsp: Go to definition
      \ nmap             <Leader>ld        :LspDefinition<CR>
Shortcut Lsp: Get Hover Information
      \ nmap             <Leader>lh        :LspHover<CR>
Shortcut Lsp: Get References
      \ nmap             <Leader>lr        :LspReferences<CR>
Shortcut Later: Add current location
      \ nmap             <Leader>ma        <Plug>LaterAdd
Shortcut Later: Clear locations
      \ nmap             <Leader>mc        <Plug>LaterClear
Shortcut Later: Edit locations file
      \ nmap             <Leader>me        <Plug>LaterEdit
Shortcut Later: Load locations to quickfix list
      \ nmap             <Leader>mq        <Plug>LaterLoadQuickfix
Shortcut Find current file in LightTree
      \ noremap          <leader>nf        :LightTreeFind<CR>
Shortcut Disable search highlight
      \ noremap          <Leader>nn        :noh<CR>
Shortcut Open LightTree in a vertical split
      \ noremap <silent> <leader>ns        :vsplit<CR>:LightTree<CR>
Shortcut Open LightTree in current window
      \ noremap <silent> <leader>nt        :LightTree<CR>
Shortcut Run PlugClean
      \ noremap          <Leader>pC        :PlugClean<CR>
Shortcut Run PlugInstall
      \ noremap          <Leader>pI        :PlugInstall<CR>
Shortcut Run PlugUpdate
      \ noremap          <Leader>pU        :PlugUpdate<CR>
Shortcut Todoist add current line to inbox
      \ noremap          <Leader>qa        :call TodoistAddItemToInbox()<CR>
Shortcut Todoist read inbox items into current buffer
      \ noremap          <Leader>qi        :call TodoistReadInbox()<CR>
Shortcut Gorg open index
      \ nmap             <Leader>qoi       :GorgOpenFile index.md<CR>
Shortcut Gorg open work tasks
      \ nmap             <Leader>qow       :GorgOpenFile Work Tasks.md<CR>
Shortcut Gorg open personal tasks
      \ nmap             <Leader>qop       :GorgOpenFile Personal Tasks.md<CR>
Shortcut Reload current file
      \ noremap          <Leader>r<Space>  :e!<CR>
Shortcut Activate register
      \ noremap          <Leader>r         "
Shortcut List snippet files for current buffer
      \ noremap          <Leader>sl        :SnipMateOpenSnippetFiles<CR>
Shortcut Enable spellcheck for English
      \ noremap          <Leader>se        :setlocal spell spelllang=en_us<CR>
Shortcut Disable spellcheck
      \ noremap          <Leader>sn        :setlocal nospell<CR>
Shortcut Enable spellcheck for Portuguese
      \ noremap          <Leader>sp        :setlocal spell spelllang=pt_br<CR>
Shortcut Open alternate file in horizontal split
      \ noremap          <Leader>ts        :AS<CR>
Shortcut Toggle alternate file
      \ noremap          <Leader>tt        :A<CR>
Shortcut Open alternate file in vertical split
      \ noremap          <Leader>tv        :AV<CR>
Shortcut Run bundler
      \ nmap             <Leader>vb :call TermRun("bundle install")<CR>
Shortcut Test: Run tests for cached files in git
      \ nmap             <Leader>vc :call TermRun(runner#cached())<CR>
Shortcut Test: Rerun last command
      \ nmap             <Leader>vl :call TermRun(runner#last())<CR>
Shortcut Test: Toggle runner
      \ nmap             <Leader>vo :call TermToggle()<CR>
Shortcut Test: Run tests for files in quickfix
      \ nmap             <Leader>vq :call TermRun(runner#quickfix())<CR>
Shortcut Test: Run current test
      \ nmap    <silent> <leader>vt :call TermRun(runner#nearest())<CR>
Shortcut Test: Interrupt runner
      \ nmap             <Leader>vx :call TermInterrupt()<CR>
Shortcut Test: Send current line to terminal
      \ nmap    <silent> <leader>vL :call TermRun(getline('.'))<CR>
Shortcut Test: Run tests for current file
      \ nmap    <silent> <leader>vT :call TermRun(runner#file())<CR>
Shortcut Reload vim config
      \ noremap          <Leader>vr        :source ~/.config/nvim/init.vim<CR>
Shortcut Write current buffer to file
      \ noremap          <Leader>w         :w<CR>
Shortcut Look up current word in DuckDuckGo including filetype
      \ noremap          <Leader>D         :call DuckWordWithFiletype()<CR>
Shortcut Update ctags
      \ noremap <silent> <Leader>Tg        :!ctags -R<CR>

map <F10> :echo "hi<" . synIDattr(synID(line("."),col("."),1),"name") . '> trans<'
\ . synIDattr(synID(line("."),col("."),0),"name") . "> lo<"
\ . synIDattr(synIDtrans(synID(line("."),col("."),1)),"name") . ">"<CR>

map <F9> :so $VIMRUNTIME/syntax/hitest.vim<CR>

omap aa <Plug>SidewaysArgumentTextobjA
xmap aa <Plug>SidewaysArgumentTextobjA
omap ia <Plug>SidewaysArgumentTextobjI
xmap ia <Plug>SidewaysArgumentTextobjI

nnoremap * :let @/='\<<C-R>=expand("<cword>")<CR>\>'<CR>:set hls<CR>
