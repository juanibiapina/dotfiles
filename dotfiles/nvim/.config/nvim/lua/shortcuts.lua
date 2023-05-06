-- treesitter shortcuts are defined in treesitter.lua
-- lsp shortcuts are defined in init.lua

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

-- fuzzy finder
map('<Leader>fb', ':Telescope buffers', 'Find buffer')
map('<Leader>fc', ':Telescope commands', 'Find command')
map('<Leader>fd', ':Telescope diagnostics', 'Find diagnostics')
map('<Leader>ff', ':Telescope find_files hidden=true', 'Find files')
map('<Leader>fg', ':Telescope live_grep', 'Find files')
map('<Leader>fh', ':Telescope help_tags', 'Find help tags')
map('<Leader>fk', ':Telescope keymaps', 'Find keymaps')
map('<Leader>f/', ':Telescope current_buffer_fuzzy_find', 'Find in current buffer')

map('<Leader>fj', ':%!jq .', 'Format JSON')

-- grep
map('<Leader>g<space>', ':Ack! ', 'Grep for word under cursor', { no_cr = true, silent = false })

-- git
map('<Leader>gb', ':Git blame', 'Activate git blame for current buffer')
map('<Leader>ga', '<Plug>(GitGutterStageHunk)', 'Stage current hunk')
map('<Leader>gd', '<Plug>(GitGutterPreviewHunk)', 'Preview changes in current hunk')
map('<Leader>gn', '<Plug>(GitGutterNextHunk)', 'Jump to next hunk')
map('<Leader>gu', '<Plug>(GitGutterUndoHunk)', 'Undo changes in current hunk')
map('<Leader>gp', '<Plug>(GitGutterPrevHunk)', 'Jump to previous hunk')
map('<Leader>gq', ':GLoadChanged', 'Git: load modified files into quickfix')
map('<Leader>gr', ':silent ! hub browse', 'Browse current branch in git repository')
map('<Leader>gs', ':Git', 'Run git status')
map('<Leader>gB', ':GBrowse', 'Browse current file in git repository', { modes = {'n', 'v'} })

-- lighttree
map('<leader>nf', ':LightTreeFind', 'Find current file in LightTree')
map('<Leader>nn', ':noh', 'Disable search highlight') -- disable search highlight
map('<leader>ns', ':vsplit<CR>:LightTree', 'Open LightTree in a vertical split')
map('<leader>nt', ':LightTree', 'Open LightTree in current window')

-- digital gargen
map('<Leader>qoi', ':GorgOpenFile index.md', 'Gorg open index')
map('<Leader>qow', ':GorgOpenFile Work Tasks.md', 'Gorg open work tasks')

-- spellcheck
map('<Leader>se', ':setlocal spell spelllang=en_us', 'Enable spellcheck for English')
map('<Leader>sn', ':setlocal nospell', 'Disable spellcheck')
map('<Leader>sp', ':setlocal spell spelllang=pt_br', 'Enable spellcheck for Portuguese')

-- alternative files
map('<Leader>ts', ':AS', 'Open alternate file in horizontal split')
map('<Leader>tt', ':A', 'Toggle alternate file')
map('<Leader>tv', ':AV', 'Open alternate file in vertical split')

-- terminal runner
map('<Leader>vb', ':call TermRun("bundle install")', 'Run bundler')
map('<Leader>vc', ':call TermRun(runner#cached())', 'Test: Run tests for cached files in git')
map('<Leader>vl', ':call TermRun(runner#last())', 'Test: Rerun last command')
map('<Leader>vo', ':call TermToggle()', 'Test: Toggle runner')
map('<Leader>vq', ':call TermRun(runner#quickfix())', 'Test: Run tests for files in quickfix')
map('<leader>vt', ':call TermRun(runner#nearest())', 'Test: Run current test')
map('<Leader>vx', ':call TermInterrupt()', 'Test: Interrupt runner')
map('<leader>vL', ':call TermRun(getline("."))', 'Test: Send current line to terminal')
map('<leader>vT', ':call TermRun(runner#file())', 'Test: Run tests for current file')

-- write
map('<Leader>w', ':wa', 'Write all buffers to file')

-- internet search
map('<Leader>D', ':call DuckWordWithFiletype()', 'Look up current word in DuckDuckGo including filetype')

-- ctags
map('<Leader>Tg', ':!ctags -R', 'Update ctags')

-- highlight
map('*', ":let @/='\\<<C-R>=expand(\"<cword>\")<CR>\\>'<CR>:set hls", 'Highlight word under cursor')
