-- https://github.com/nvim-treesitter/nvim-treesitter

require('nvim-treesitter.configs').setup {
  -- Don't automatically install missing parsers
  -- This is handled by nix
  auto_install = false,

  highlight = {
    enable = true,
    disable = { "ruby" }, -- disabled for ruby because it uses `is-not?` in highlights which isn't supported by nvim-treesitter
  },

  incremental_selection = {
    enable = true,
    keymaps = {
      init_selection = "<c-n>",
      node_incremental = "<c-n>",
      scope_incremental = "<c-s>",
      node_decremental = "<c-p>",
    },
  },
}
