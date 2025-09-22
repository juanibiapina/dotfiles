-- LSP status
require("fidget").setup({})

local capabilities = vim.tbl_deep_extend(
  "force",
  vim.lsp.protocol.make_client_capabilities(),
  require("cmp_nvim_lsp").default_capabilities(),
  { workspace = { didChangeWatchedFiles = { dynamicRegistration = true } } },
  { textDocument = { foldingRange = { dynamicRegistration = false, lineFoldingOnly = true } } }
)

-- Make capabilities the default for ALL LSP clients
vim.lsp.config("*", {
  capabilities = capabilities,
})

-- Per-server tweaks
vim.lsp.config("gopls", {
  settings = { gopls = { gofumpt = true } },
})

vim.lsp.config("rust_analyzer", {
  settings = {
    ["rust-analyzer"] = {
      files = { excludeDirs = { ".direnv", ".devenv" } },
    },
  },
})

vim.lsp.config("lua_ls", {
  settings = {
    Lua = {
      diagnostics = { globals = { "vim" } },
      workspace = { library = vim.api.nvim_get_runtime_file("", true) },
      telemetry = { enable = false },
    },
  },
})

-- Enable servers (defaults come from nvim-lspconfig's configs)
local servers = {
  "gdscript",
  "markdown_oxide",
  "nixd",
  "pyright",
  "ruby_lsp",
  "terraformls",
  "ts_ls",
  "bashls",
  "gopls",
  "rust_analyzer",
  "lua_ls",
}

vim.lsp.enable(servers)
