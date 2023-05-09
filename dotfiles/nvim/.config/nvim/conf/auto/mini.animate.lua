require("mini.animate").setup({
  scroll = {
    timing = require("mini.animate").gen_timing.linear({ duration = 100, unit = "total" }),
  },
  cursor = {
    timing = require("mini.animate").gen_timing.linear({ duration = 100, unit = "total" }),
  },
})
