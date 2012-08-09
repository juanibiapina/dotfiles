function _lein_commands() {
local ret=1 state
_arguments ':subcommand:->subcommand' && ret=0

case $state in
  subcommand)
    subcommands=(
    "check:check syntax and warn on reflection"
    "classpath:print the classpath of the current project"
    "clean:remove all files from project's target-path"
    "compile:compile clojure source into class files."
    "deploy:build jar and deploy to remote repository"
    "deps:download all dependencies"
    "help:display a list of tasks or help for a given task"
    "install:install current project to the local repository"
    "jack-in:jack in to a clojure slime session from emacs"
    "jar:package up all the project's files into a jar file"
    "javac:compile java source files"
    "new:generate project scaffolding based on a template"
    "pom:write a pomxml file to disk for maven interoperability."
    "profiles:list all available profiles or display one if given an argument"
    "repl:start a repl session either with the current project or standalone"
    "retest:run only the test namespaces which failed last time around"
    "run:run the project's -main function"
    "search:search remote maven repositories for matching jars"
    "swank:launch swank server for emacs to connect"
    "swank-wrap:launch a swank server on the specified port, then run a -main function"
    "test:run the project's tests"
    "trampoline:run a task without nesting the project's jvm inside leiningen's"
    "uberjar:package up the project files and all dependencies into a jar file"
    "upgrade:upgrade leiningen to the latest stable release"
    "version:print version for leiningen and the current jvm"
    "vimclojure:adds vimclojure server support to a leiningen project"
    "with-profile:apply the given task with the profile(s) specified"
    )
    _describe -t subcommands 'leiningen subcommands' subcommands && ret=0
esac

return ret
}

compdef _lein_commands lein
