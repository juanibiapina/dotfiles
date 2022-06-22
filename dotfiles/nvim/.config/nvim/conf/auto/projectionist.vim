autocmd FileType *
  \ if &buftype ==# 'quickfix' |
  \   call ProjectionistDetect(getcwd()) |
  \ endif

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
      \  "*.gemspec" : {
      \    "lib/*.rb" : {
      \      "alternate": "spec/{}_spec.rb",
      \      "type" : "lib"
      \    },
      \    "spec/*_spec.rb" : {
      \      "alternate": "lib/{}.rb",
      \      "type" : "spec",
      \    }
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
      \      "alternate": "test/{}.js",
      \    },
      \    "test/*.js" : {
      \      "alternate": "lib/{}.js",
      \      "type" : "spec",
      \    },
      \    "src/*.js" : {
      \      "alternate": "test/{}.test.js",
      \    },
      \    "test/*.test.js" : {
      \      "alternate": "src/{}.js",
      \      "runner": "npm test --",
      \      "type" : "spec",
      \    },
      \    "src/*.tsx" : {
      \      "alternate": "src/{}.test.tsx",
      \    },
      \    "src/*.test.tsx" : {
      \      "alternate": "src/{}.tsx",
      \      "type" : "spec",
      \    },
      \  },
      \}
