let g:projectionist_heuristics = {
      \  "config/application.rb" : {
      \    "app/*.rb" : {
      \      "alternate": "spec/{}_spec.rb",
      \      "type": "app"
      \    },
      \    "spec/*_spec.rb" : {
      \      "alternate": "app/{}.rb",
      \      "type" : "spec"
      \    },
      \    "lib/*.rb" : {
      \      "alternate": "spec/lib/{}_spec.rb",
      \      "type" : "lib"
      \    },
      \    "spec/lib/*_spec.rb" : {
      \      "alternate": "lib/{}.rb",
      \      "type" : "spec"
      \    }
      \  }
      \}
