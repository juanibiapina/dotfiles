require("telescope").setup({
  defaults = {
    mappings = {
      i = {
        ["<esc>"] = require("telescope.actions").close,
        ["<C-j>"] = require("telescope.actions").move_selection_next,
        ["<C-k>"] = require("telescope.actions").move_selection_previous,
      },
    },

    -- set default previewers to use the terminal because sometimes treesitter highlighting doesn't work
    -- mainly for ruby at this point
    file_previewer = require'telescope.previewers'.cat.new,
    grep_previewer = require'telescope.previewers'.vimgrep.new,
    qflist_previewer = require'telescope.previewers'.qflist.new,
  },
})

