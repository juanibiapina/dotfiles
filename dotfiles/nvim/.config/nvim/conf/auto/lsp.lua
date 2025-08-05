-- Status updates for LSP
require("fidget").setup({})

-- configure LSP servers
-- list of available LSP servers:
-- https://github.com/neovim/nvim-lspconfig/blob/master/doc/configs.md
local servers = {
  "gdscript",
  "markdown_oxide",
  "nixd",
  "pyright",
  "ruby_lsp",
  "terraformls",
  "ts_ls",
  "bashls",
}

-- https://github.com/neovim/nvim-lspconfig/wiki/Autocompletion
-- https://github.com/hrsh7th/cmp-nvim-lsp/issues/42#issuecomment-1283825572
local capabilities = vim.tbl_deep_extend(
  'force',
  vim.lsp.protocol.make_client_capabilities(),
  require('cmp_nvim_lsp').default_capabilities(),
  -- File watching is disabled by default for neovim.
  -- See: https://github.com/neovim/neovim/pull/22405
  { workspace = { didChangeWatchedFiles = { dynamicRegistration = true } } },
  { -- Enable folding range support (for nvim-ufo)
    textDocument = {
      foldingRange = {
        dynamicRegistration = false,
        lineFoldingOnly = true,
      },
    }
  }
);

for _, server in ipairs(servers) do
  require('lspconfig')[server].setup {
    capabilities = capabilities,
  }
end

require('lspconfig')["gopls"].setup {
  capabilities = capabilities,
  settings = {
    ["gopls"] = {
      gofumpt = true,
    },
  }
}

require('lspconfig')["rust_analyzer"].setup {
  capabilities = capabilities,
  settings = {
    ["rust-analyzer"] = {
      files = {
        excludeDirs = { ".direnv", ".devenv" },
      },
    }
  }
}

require('lspconfig')["lua_ls"].setup {
  settings = {
    Lua = {
      diagnostics = {
        globals = {
          'vim',
        },
      },
      workspace = {
        -- Make the server aware of Neovim runtime files
        library = vim.api.nvim_get_runtime_file("", true),
      },
      -- Do not send telemetry data containing a randomized but unique identifier
      telemetry = {
        enable = false,
      },
    },
  },
}
