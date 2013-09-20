if command -v brew >/dev/null 2>&1; then
  export CONFIGURE_OPTS="--with-readline-dir=`brew --prefix readline` --without-tcl --without-tk"
  export RUBY_CONFIGURE_OPTS="--with-openssl-dir=`brew --prefix openssl`"
  export CFLAGS=-Wno-error=shorten-64-to-32
fi

