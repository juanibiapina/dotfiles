alias g=git

# disable git autocompletion
__git_files () {
  _wanted files expl 'local files' _files
}
