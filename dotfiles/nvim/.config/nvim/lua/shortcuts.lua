-- treesitter shortcuts are defined in treesitter.lua

local function map(lhs, rhs, desc, options)
  options = options or {}
  local silent = options.silent == nil and true or options.silent
  local no_cr = options.no_cr or false
  local modes = options.modes or {'n'}
  local filetype = options.filetype -- Extract filetype from options, if provided

  -- Add a <CR> to the rhs if no_cr is not set to true and rhs does not start with <Plug>
  if not no_cr and not rhs:match('^<Plug>') then
    rhs = rhs .. '<CR>'
  end

  if filetype then
    -- Create a filetype-specific mapping using autocommands
    vim.api.nvim_create_autocmd("FileType", {
      pattern = filetype,
      callback = function()
        for _, mode in ipairs(modes) do
          vim.api.nvim_buf_set_keymap(0, mode, lhs, rhs, {noremap = true, silent = silent, desc = desc})
        end
      end
    })
  else
    -- Create a global mapping if no filetype is specified
    for _, mode in ipairs(modes) do
      vim.api.nvim_set_keymap(mode, lhs, rhs, {noremap = true, silent = silent, desc = desc})
    end
  end
end


-- trigger completions
vim.api.nvim_set_keymap('i', '<C-n>', 'pumvisible() ? "\\<C-n>" : "\\<Cmd>lua require(\'cmp\').complete()<CR>"', {expr = true, noremap = true, silent = true})

-- CTRL+W extensions
map('<C-w>n', ':rightbelow vnew<CR>', 'Split window vertically')

-- Enter key for following Obsidian style links in Markdown files
map('<CR>', '<Plug>GorgOpenFileForCurrentLine', 'Digital Garden follow link', { filetype = 'markdown' })

-- a: arguments
map('<Leader>aH', ':SidewaysLeft', 'Move current argument to the left')
map('<Leader>aL', ':SidewaysRight', 'Move current argument to the right')

-- b: buffer
map('<Leader>bc', ':let @+=expand("%")', 'Copy relative filename to clipboard', { silent = false })
map('<Leader>bC', ':let @+=expand("%:p")', 'Copy absolute filename to clipboard', { silent = false })
map('<Leader>bd', ':Bwipeout', 'Wipeout current buffer keeping window layout')
map('<Leader>bl', ':b#', 'Switch to last used buffer')
map('<Leader>bo', ':%bd \\| :e #', 'Close all other buffers')
map('<Leader>bD', ':bwipeout', 'Wipeout current buffer')

-- c: chat, color
map('<Leader>cc', ':CopilotChatToggle', 'Toggle Copilot chat')
map('<Leader>cp', ':CccPick', 'Open color picker')

-- d: misc
map('<Leader>dd', '<Plug>GorgCompleteItem', 'Digital Garden complete item', { filetype = 'markdown' })
map('<Leader>dg', ':call OpenGithubRepo()', 'Open Github repo in current line on the Browser')
map('<Leader>D', ':call DuckWordWithFiletype()', 'Look up current word in DuckDuckGo including filetype')

-- f: fuzzy finder
map('<Leader>f<space>', ':Telescope', 'Find Telescope pickers')
map('<Leader>fb', ':Telescope buffers', 'Find buffer')
map('<Leader>fc', ':Telescope commands', 'Find command')
map('<Leader>fd', ':Telescope diagnostics', 'Find diagnostics')
map('<Leader>ff', ':Telescope find_files hidden=true find_command=fd,--type,f,--hidden,--exclude,.git', 'Find files')
map('<Leader>fg', ':Telescope git_status', 'Find file in git status')
map('<Leader>fh', ':Telescope help_tags', 'Find help tags')
map('<Leader>fm', ':Telescope keymaps', 'Find keymaps')
map('<Leader>fs', ':Telescope lsp_document_symbols', 'Find document symbols')
map('<Leader>f/', ':Telescope current_buffer_fuzzy_find', 'Find in current buffer')

-- f: format JSON
map('<Leader>fj', ':%!jq .', 'Format JSON using jq')

-- g: grep
map('<Leader>g<space>', ':Ack! ', 'Grep for word under cursor', { no_cr = true, silent = false })

-- g: git
map('<Leader>ga', ':<C-U>Gitsigns stage_hunk', 'Stage current hunk')
map('<Leader>gb', ':Git blame', 'Activate git blame for current buffer')
map('<Leader>gB', ':GBrowse', 'Browse current file in git repository', { modes = {'n', 'v'} })
map('<leader>gd', ':<C-U>Gitsigns preview_hunk', 'Diff current hunk in float')
map('<leader>gD', ':<C-U>Gitsigns diffthis', 'Diff current hunk in new split')
map('<leader>gn', ':<C-U>Gitsigns next_hunk', 'Jump to next hunk')
map('<leader>gp', ':<C-U>Gitsigns prev_hunk', 'Jump to previous hunk')
map('<Leader>gq', ':GLoadChanged', 'Git: load modified files into quickfix')
map('<Leader>gr', ':silent ! hub browse', 'Browse current branch in git repository')
map('<leader>gu', ':<C-U>Gitsigns reset_hunk', 'Reset hunk')

-- l: lsp
map('<Leader>ld', ':lua vim.lsp.buf.definition()', 'LSP: Goto definition')
map('<Leader>lD', ':lua vim.lsp.buf.declaration()', 'LSP: Goto declaration')
map('<Leader>lf', ':lua vim.lsp.buf.format()', 'LSP: Format buffer')
map('<Leader>li', ':lua vim.lsp.buf.implementation()', 'LSP: Goto immplementation')
map('<Leader>lr', ':lua vim.lsp.buf.references()', 'LSP: List references')
map('<Leader>ls', ':lua vim.lsp.buf.signature_help()', 'LSP: Signature help')
map('<Leader>lt', ':lua vim.lsp.buf.type_definition()', 'LSP: Goto type definition')
map('<Leader>lla', ':lua vim.lsp.buf.code_action()', 'LSP: Code action')
map('<Leader>llr', ':lua vim.lsp.buf.rename()', 'LSP: Rename symbol')

-- m: mark
map('<Leader>mf', ':MarkAddContextItemFile<CR>', 'Mark: Add context item for current file')
map('<Leader>mr', ':MarkRun<CR>', 'Mark: Run agent')
map('<Leader>mt', ':MarkAddContextItemText ', 'Mark: Add context item with text', { no_cr = true, silent = false })
map('<Leader>mq', ':MarkQuestion ', 'Mark: ask a question about the current file', { no_cr = true, silent = false })

-- n: file manager
map('<leader>nf', ':Neotree reveal', 'Find current file in file manager')
map('<leader>ns', ':leftabove vsplit<CR>:Neotree current', 'Open file manager in a vertical split')
map('<leader>nt', ':Neotree toggle', 'Toggle file manager drawer')

-- nn: disable search highlight
map('<Leader>nn', ':noh', 'Disable search highlight') -- disable search highlight

-- q: quickfix
map('<Leader>qq', ':lua ToggleQuickfix()', 'Toggle quickfix window')

-- qo: digital garden
map('<Leader>qoi', ':GorgOpenFile index.md', 'Gorg open index')
map('<Leader>qow', ':GorgOpenFile Work Tasks.md', 'Gorg open work tasks')

-- rr
map('<Leader>rr', ':e!', 'Reload current buffer')

-- s: spellcheck
map('<Leader>se', ':setlocal spell spelllang=en_us', 'Enable spellcheck for English')
map('<Leader>sn', ':setlocal nospell', 'Disable spellcheck')
map('<Leader>sp', ':setlocal spell spelllang=pt_br', 'Enable spellcheck for Portuguese')

-- t: trouble
map('<Leader>td', ':Trouble diagnostics toggle', 'Trouble: Toggle diagnostics')
map('<Leader>tn', ':lua require("trouble").next({skip_groups = true, jump = true})', 'Trouble: Next item')
map('<Leader>tp', ':lua require("trouble").prev({skip_groups = true, jump = true})', 'Trouble: Previous item')
map('<Leader>tq', ':Trouble qflist toggle focus=false', 'Trouble: Toggle quickfix list')
map('<Leader>ts', ':Trouble symbols toggle focus=false', 'Trouble: Toggle symbols')

-- t: toggle alternate files
map('<Leader>tt', ':A', 'Toggle alternate file')
map('<Leader>tv', ':AV', 'Open alternate file in vertical split')

-- v: terminal runner
map('<Leader>vb', ':lua TermRun("bundle install")', 'Run bundler')
map('<Leader>vc', ':lua TermRun(runner#cached())', 'Test: Run tests for cached files in git')
map('<Leader>vl', ':lua TermRun(runner#last())', 'Test: Rerun last command')
map('<Leader>vo', ':lua TermToggle()', 'Test: Toggle runner')
map('<Leader>vq', ':lua TermRun(runner#quickfix())', 'Test: Run tests for files in quickfix')
map('<leader>vt', ':lua TermRun(runner#nearest())', 'Test: Run current test')
map('<leader>vL', ':lua TermRun(getline("."))', 'Test: Send current line to terminal')
map('<leader>vT', ':lua TermRun(runner#file())', 'Test: Run tests for current file')

-- w
map('<Leader>w', ':wall', 'Write all buffers')

-- ctags
map('<Leader>Tg', ':!ctags -R', 'Update ctags')

-- highlight
map('*', ":let @/='\\<<C-R>=expand(\"<cword>\")<CR>\\>'<CR>:set hls", 'Highlight word under cursor')

-- text objects
vim.api.nvim_set_keymap('o', 'aa', '<Plug>SidewaysArgumentTextobjA', {})
vim.api.nvim_set_keymap('o', 'ia', '<Plug>SidewaysArgumentTextobjI', {})
