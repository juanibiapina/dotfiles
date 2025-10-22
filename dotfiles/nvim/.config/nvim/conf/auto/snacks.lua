require("snacks").setup {
  indent = {
    enable = true, -- enable indent guides
    animate = {
      enabled = false, -- disable indent animation
    },
  },
  dashboard = {
    enabled = true,
    -- Exclude startup section since we use vim-plug, not lazy.nvim
    sections = {
      { section = "header" },
      { section = "keys", gap = 1, padding = 1 },
    },
  },
}
