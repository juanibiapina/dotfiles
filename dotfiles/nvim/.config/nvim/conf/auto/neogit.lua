require('neogit').setup({
  disable_commit_confirmation = true,
  disable_hint = true,
  kind = "replace",
  commit_popup = {
    kind = "replace",
  },
  sections = {
    untracked = {
      folded = false
    },
    unstaged = {
      folded = false
    },
    staged = {
      folded = false
    },
    stashes = false,
    unpulled = false,
    unmerged = false,
    recent = false,
  },
})
