local elements = require('drex.elements')

require('drex.config').configure {
  hide_cursor = false,

  keybindings = {
    ['n'] = {
      ['<CR>']  = function()
        local line = vim.api.nvim_get_current_line()

        if require('drex.utils').is_open_directory(line) then
          elements.collapse_directory()
        else
          elements.expand_element()
        end
      end,
      ['<C-v>'] = { '<cmd>lua require("drex.elements").open_file("vs")<CR>', { desc = 'open file in vsplit' } },
      ['<C-x>'] = { '<cmd>lua require("drex.elements").open_file("sp")<CR>', { desc = 'open file in split' } },
      ['<C-l>'] = { '<cmd>lua require("drex.elements").open_directory()<CR>', { desc = 'open directory in new buffer' } },
      ['<C-h>'] = { '<cmd>lua require("drex.elements").open_parent_directory()<CR>', { desc = 'open parent directory in new buffer' } },
      ['gj']    = { '<cmd>lua require("drex.actions.jump").jump_to_next_sibling()<CR>', { desc = 'jump to next sibling' } },
      ['gk']    = { '<cmd>lua require("drex.actions.jump").jump_to_prev_sibling()<CR>', { desc = 'jump to prev sibling' } },
      ['gh']    = { '<cmd>lua require("drex.actions.jump").jump_to_parent()<CR>', { desc = 'jump to parent element' } },
      ['s']     = { '<cmd>lua require("drex.actions.stats").stats()<CR>', { desc = 'show element stats' } },
      ['a']     = { '<cmd>lua require("drex.actions.files").create()<CR>', { desc = 'create element' } },
      ['d']     = { '<cmd>lua require("drex.actions.files").delete("line")<CR>', { desc = 'delete element' } },
      ['D']     = { '<cmd>lua require("drex.actions.files").delete("clipboard")<CR>', { desc = 'delete (clipboard)' } },
      ['p']     = { '<cmd>lua require("drex.actions.files").copy_and_paste()<CR>', { desc = 'copy & paste (clipboard)' } },
      ['P']     = { '<cmd>lua require("drex.actions.files").cut_and_move()<CR>', { desc = 'cut & move (clipboard)' } },
      ['r']     = { '<cmd>lua require("drex.actions.files").rename()<CR>', { desc = 'rename element' } },
      ['R']     = { '<cmd>lua require("drex").reload_directory()<CR>', { desc = 'reload' } },
      ['/']     = { '<cmd>keepalt lua require("drex.actions.search").search()<CR>', { desc = 'search' } },
      ['M']     = { '<cmd>DrexMark<CR>', { desc = 'mark element' } },
      ['u']     = { '<cmd>DrexUnmark<CR>', { desc = 'unmark element' } },
      ['m']     = { '<cmd>DrexToggle<CR>', { desc = 'toggle element' } },
      ['cc']    = { '<cmd>lua require("drex.clipboard").clear_clipboard()<CR>', { desc = 'clear clipboard' } },
      ['cs']    = { '<cmd>lua require("drex.clipboard").open_clipboard_window()<CR>', { desc = 'edit clipboard' } },
      ['y']     = { '<cmd>lua require("drex.actions.text").copy_name()<CR>', { desc = 'copy element name' } },
      ['Y']     = { '<cmd>lua require("drex.actions.text").copy_relative_path()<CR>', { desc = 'copy element relative path' } },
      ['<C-y>'] = { '<cmd>lua require("drex.actions.text").copy_absolute_path()<CR>', { desc = 'copy element absolute path' } },
    },
    ['v'] = {
      ['d'] = { ':lua require("drex.actions.files").delete("visual")<CR>', { desc = 'delete elements' } },
      ['r'] = { ':lua require("drex.actions.files").multi_rename("visual")<CR>', { desc = 'rename elements' } },
      ['M'] = { ':DrexMark<CR>', { desc = 'mark elements' } },
      ['u'] = { ':DrexUnmark<CR>', { desc = 'unmark elements' } },
      ['m'] = { ':DrexToggle<CR>', { desc = 'toggle elements' } },
      ['y'] = { ':lua require("drex.actions.text").copy_name(true)<CR>', { desc = 'copy element names' } },
      ['Y'] = { ':lua require("drex.actions.text").copy_relative_path(true)<CR>', { desc = 'copy element relative paths' } },
      ['<C-y>'] = { ':lua require("drex.actions.text").copy_absolute_path(true)<CR>', { desc = 'copy element absolute paths' } },
    }
  }
}

vim.api.nvim_create_user_command('DrexFind', function()
    local path = require('drex.utils').expand_path('%')

    if not vim.loop.fs_lstat(path) then
        vim.notify('The buffer path "' .. path .. '" does not point to an existing file!', vim.log.levels.ERROR, {})
        return
    end

    require('drex').open_directory_buffer('.')

    local win = vim.api.nvim_get_current_win()

    require('drex.elements').focus_element(win, path)
end, {
    desc = 'Find current buffer in Drex',
})

-- Set drex buffer to not be listed
vim.api.nvim_create_autocmd('FileType', {
    group = vim.api.nvim_create_augroup('DrexNotListed', {}),
    pattern = 'drex',
    command = 'setlocal nobuflisted'
})
