require("trouble").setup {}

vim.api.nvim_set_hl(0, "TroublePos", { link = "Normal" })
vim.api.nvim_set_hl(0, "TroubleCode", { link = "Normal" })
vim.api.nvim_set_hl(0, "TroubleIndent", { link = "Normal" })
vim.api.nvim_set_hl(0, "TroubleIndentFoldClosed", { link = "Normal" })
vim.api.nvim_set_hl(0, "TroubleNormal", { link = "Normal" })
vim.api.nvim_set_hl(0, "TroubleNormalNC", { link = "NormalNC" })
