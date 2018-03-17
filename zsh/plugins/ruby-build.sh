if command -v brew >/dev/null 2>&1; then
  export RUBY_CONFIGURE_OPTS="--with-readline-dir=`brew --prefix readline` --with-openssl-dir=`brew --prefix openssl` --without-tcl --without-tk"
  export CFLAGS=-Wno-error=shorten-64-to-32
fi

