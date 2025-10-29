require("trouble").setup {
  auto_preview = false,
  focus = false,
  warn_no_results = false,
  open_no_results = true,
  modes = {
    symbols = {
      win = {
        size = 0.25,
        position = "right",
      },
    },
  },
}

vim.api.nvim_set_hl(0, "TroublePos", { link = "Normal" })
vim.api.nvim_set_hl(0, "TroubleCode", { link = "Normal" })
vim.api.nvim_set_hl(0, "TroubleIndent", { link = "Normal" })
vim.api.nvim_set_hl(0, "TroubleIndentFoldClosed", { link = "Normal" })
vim.api.nvim_set_hl(0, "TroubleNormal", { link = "Normal" })
vim.api.nvim_set_hl(0, "TroubleNormalNC", { link = "NormalNC" })
