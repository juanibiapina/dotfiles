require("telescope").setup({
  defaults = {
    -- Show full filename in preview title bar
    dynamic_preview_title = true,

    -- Show filename first in results, with path dimmed
    path_display = { "filename_first" },

    layout_strategy = "horizontal",
    layout_config = {
      horizontal = {
        width = 0.95,
        height = 0.85,
        preview_width = 0.4,
        prompt_position = "bottom",
      },
    },

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

