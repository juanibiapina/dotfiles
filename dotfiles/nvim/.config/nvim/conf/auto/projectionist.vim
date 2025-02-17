" disable for terminal buffers
" https://github.com/mikavilpas/yazi.nvim/issues/638
let g:projectionist_ignore_term = 1

let g:projectionist_heuristics = {
      \  "bin/spring" : {
      \    "spec/*_spec.rb" : {
      \      "runner" : "bin/spring rspec"
      \    },
      \  },
      \  "!bin/spring&Gemfile" : {
      \    "spec/*_spec.rb" : {
      \      "runner" : "bundle exec rspec"
      \    },
      \  },
      \  "config/application.rb" : {
      \    "app/*.rb" : {
      \      "alternate": "spec/{}_spec.rb",
      \      "type": "app"
      \    },
      \    "spec/*_spec.rb" : {
      \      "alternate": "app/{}.rb",
      \      "type" : "spec",
      \    },
      \    "lib/*.rb" : {
      \      "alternate": "spec/lib/{}_spec.rb",
      \      "type" : "lib"
      \    },
      \    "spec/lib/*_spec.rb" : {
      \      "alternate": "lib/{}.rb",
      \      "type" : "spec",
      \    },
      \  },
      \  ".ruby-version" : {
      \    "lib/*.rb" : {
      \      "alternate": "spec/{}_spec.rb",
      \      "type" : "lib"
      \    },
      \    "spec/*_spec.rb" : {
      \      "alternate": "lib/{}.rb",
      \      "type" : "spec",
      \    }
      \  },
      \  "go.mod" : {
      \    "*.go" : {
      \      "alternate": "{}_test.go",
      \    },
      \    "*_test.go" : {
      \      "alternate": "{}.go",
      \      "runner": "go test -p 1 --count 1",
      \      "type" : "spec",
      \    }
      \  },
      \  "package.json" : {
      \    "lib/*.js" : {
      \      "alternate": ["test/{}.test.js", "test/{}.js"],
      \    },
      \    "src/*.js" : {
      \      "alternate": ["test/{}.test.js", "test/{}.js"],
      \    },
      \    "test/*.test.js" : {
      \      "alternate": ["lib/{}.js", "src/{}.js"],
      \      "runner": "npm test --",
      \      "type" : "spec",
      \    },
      \    "src/*.ts" : {
      \      "alternate": ["test/{}.test.ts", "test/{}.spec.ts", "src/{}.test.ts"],
      \    },
      \    "src/*.test.ts" : {
      \      "alternate": "src/{}.ts",
      \      "runner": "npm test --",
      \      "type" : "spec",
      \    },
      \    "test/*.test.ts" : {
      \      "alternate": "src/{}.ts",
      \      "runner": "npm test --",
      \      "type" : "spec",
      \    },
      \    "test/*.spec.ts" : {
      \      "alternate": "src/{}.ts",
      \      "runner": "npm test --",
      \      "type" : "spec",
      \    },
      \    "src/*.tsx" : {
      \      "alternate": ["src/{}.test.tsx", "src/{}.spec.tsx"],
      \    },
      \    "src/*.spec.tsx" : {
      \      "alternate": "src/{}.tsx",
      \      "type" : "spec",
      \    },
      \    "src/*.test.tsx" : {
      \      "alternate": "src/{}.tsx",
      \      "type" : "spec",
      \    },
      \    "src/*.jsx" : {
      \      "alternate": "src/{}.spec.jsx",
      \    },
      \    "src/*.spec.jsx" : {
      \      "alternate": "src/{}.jsx",
      \      "type" : "spec",
      \    },
      \  },
      \}
