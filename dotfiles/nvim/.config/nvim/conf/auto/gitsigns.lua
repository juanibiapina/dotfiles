require('gitsigns').setup{
  signs = {
    add = { text = '+' },
    change = { text = '~' },
    delete = { text = '_' },
    topdelete = { text = '‾' },
    changedelete = { text = '~' },
  },
  on_attach = function(bufnr)
    local gs = package.loaded.gitsigns

    local function map(mode, l, r, opts)
      opts = opts or {}
      opts.buffer = bufnr
      vim.keymap.set(mode, l, r, opts)
    end

    -- Normal mode actions
    map('n', '<leader>ga', gs.stage_hunk)
    map('n', '<leader>gD', gs.diffthis)
    map('n', '<leader>gd', gs.preview_hunk)
    map('n', '<leader>gn', gs.next_hunk)
    map('n', '<leader>gp', gs.prev_hunk)
    map('n', '<leader>gr', gs.reset_hunk)
    map('n', '<leader>gu', gs.undo_stage_hunk)

    -- Visual mode actions
    map('v', '<leader>gr', function() gs.reset_hunk {vim.fn.line("."), vim.fn.line("v")} end)
    map('v', '<leader>ga', function() gs.stage_hunk {vim.fn.line("."), vim.fn.line("v")} end)

    -- Text object
    map({'o', 'x'}, 'ih', ':<C-U>Gitsigns select_hunk<CR>')
  end
}
