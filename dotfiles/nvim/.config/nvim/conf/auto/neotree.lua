require("neo-tree").setup({
  filesystem = {
    bind_to_cwd = true, -- true creates a 2-way binding between vim's cwd and neo-tree's root

    cwd_target = {
      sidebar = "none", -- sidebar is when position = left or right
      current = "none" -- current is when position = current
    },

    follow_current_file = {
      enabled = true,         -- Enable auto-sync with current buffer
      leave_dirs_open = true, -- Keep directories expanded when revealing files
    },

    window = {
      mappings = {
        ["/"] = "noop" -- disable fuzzy finder
      }
    },

    filtered_items = {
      visible = true, -- when true, they will just be displayed differently than normal items
      hide_dotfiles = false,
      hide_gitignored = true,
    }
  },

  buffers = {
    follow_current_file = {
      enabled = true,         -- Enable auto-sync with current buffer
      leave_dirs_open = true, -- Keep directories expanded when revealing files
    },
  },
})
