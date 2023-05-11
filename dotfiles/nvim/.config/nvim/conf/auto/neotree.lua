require("neo-tree").setup({
  filesystem = {
    filtered_items = {
      visible = true,
    },
    window = {
      mappings = {
        ["/"] = "noop" -- disable fuzzy finder
      },
    },
  },
})
