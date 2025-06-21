{
  homebrew = {
    brews = [
      # ruby-build dependencies
      # https://github.com/rbenv/ruby-build/wiki#suggested-build-environment
      "autoconf"
      "gmp"
      "libyaml"
      "openssl"
      "readline"

      "libpq" # PostgreSQL client libraries, for pg gem

      "mise" # version manager
    ];
  };
}
