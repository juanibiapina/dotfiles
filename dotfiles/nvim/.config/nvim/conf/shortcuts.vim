" treesitter shortcuts are defined in treesitter.lua
" lsp shortcuts are defined in init.lua

lua << EOF

local function map(lhs, rhs, desc, options)
  options = options or {}
  local silent = options.silent == nil and true or options.silent
  local no_cr = options.no_cr or false
  local modes = options.modes or {'n'}

  if not no_cr and not rhs:match('^<Plug>') then
    rhs = rhs .. '<CR>'
  end

  for _, mode in ipairs(modes) do
    vim.api.nvim_set_keymap(mode, lhs, rhs, {noremap = true, silent = silent, desc = desc})
  end
end

-- buffer
map('<Leader>bc', ':let @+=expand("%")', 'Copy relative filename to clipboard', { silent = false })
map('<Leader>bC', ':let @+=expand("%:p")', 'Copy absolute filename to clipboard', { silent = false })
map('<Leader>bd', ':Bwipeout', 'Wipeout current buffer keeping window layout')
map('<Leader>bl', ':b#', 'Switch to last used buffer')
map('<Leader>bo', ':%bd \\| :e #', 'Close all other buffers')
map('<Leader>bD', ':bwipeout', 'Wipeout current buffer')

-- clipboard
map('<leader>cb', '"+', 'Select system clipboard', { no_cr = true, modes = {'n', 'v'} })

-- other shortcuts
map('<Leader>dg', ':call OpenGithubRepo()', 'Open Github repo in current line on the Browser')
map('<Leader>fd', ':Remove', 'Delete current file and buffer')

-- fuzzy finder
map('<Leader>fb', ':Telescope buffers', 'Find buffer')
map('<Leader>fc', ':Telescope commands', 'Find command')
map('<Leader>ff', ':Telescope find_files hidden=true', 'Find files')
map('<Leader>fh', ':Telescope help_tags', 'Find help tags')
map('<Leader>fk', ':Telescope keymaps', 'Find keymaps')

-- formatting
map('<Leader>fj', ':%!jq .', 'Format JSON')
EOF
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
      \ nmap             <Leader>gs        :Git<CR>
Shortcut Browse current selection in git repository
      \ vnoremap         <Leader>gB        :GBrowse<CR>
Shortcut Browse current file in git repository
      \ nmap             <Leader>gB        :GBrowse<CR>
Shortcut Disable GitGutter
      \ nmap             <Leader>gD        :GitGutterDisable<CR>
Shortcut Enable GitGutter
      \ nmap             <Leader>gE        :GitGutterEnable<CR>
Shortcut Javascript: Run eslint on current buffer
      \ nmap             <Leader>je        :ALEFix eslint<CR>
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
Shortcut Write all buffers to file
      \ noremap          <Leader>w         :wa<CR>
Shortcut Look up current word in DuckDuckGo including filetype
      \ noremap          <Leader>D         :call DuckWordWithFiletype()<CR>
Shortcut Update ctags
      \ noremap <silent> <Leader>Tg        :!ctags -R<CR>

" show syntax highlighting groups
map <F9> :so $VIMRUNTIME/syntax/hitest.vim<CR>

" highlight current word
nnoremap * :let @/='\<<C-R>=expand("<cword>")<CR>\>'<CR>:set hls<CR>
