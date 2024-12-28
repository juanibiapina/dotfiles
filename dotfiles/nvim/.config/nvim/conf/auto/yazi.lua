require("yazi").setup {
  opts = {
    open_for_directories = false,
    cmd = {
      'Yazi',
      'Yazi cwd',
      'Yazi toggle',
    },
  },
  -- disable distracting highlight_groups
  highlight_groups = {
    -- See https://github.com/mikavilpas/yazi.nvim/pull/180
    hovered_buffer = nil,
    -- See https://github.com/mikavilpas/yazi.nvim/pull/351
    hovered_buffer_in_same_directory = nil,
  },
}
