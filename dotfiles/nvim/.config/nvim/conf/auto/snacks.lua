require("snacks").setup {
  indent = {
    enable = true, -- enable indent guides
    animate = {
      enabled = false, -- disable indent animation
    },
  },
  dashboard = {
    enabled = true,
    preset = {
      -- Override default keys to remove unused 'c' config option
      keys = {
        { icon = " ", key = "f", desc = "Find File", action = ":lua Snacks.dashboard.pick('files')" },
        { icon = " ", key = "n", desc = "New File", action = ":ene | startinsert" },
        { icon = " ", key = "g", desc = "Find Text", action = ":lua Snacks.dashboard.pick('live_grep')" },
        { icon = " ", key = "r", desc = "Recent Files", action = ":lua Snacks.dashboard.pick('oldfiles')" },
        { icon = " ", key = "q", desc = "Quit", action = ":qa" },
      },
    },
    -- Exclude startup section since we use vim-plug, not lazy.nvim
    sections = {
      { section = "header" },
      { section = "keys", gap = 1, padding = 1 },
    },
  },
}
