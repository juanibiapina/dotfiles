if command -v brew >/dev/null 2>&1; then
  export CONFIGURE_OPTS="--with-readline-dir=/usr/local/opt/readline --without-tcl --without-tk"
  export RUBY_CONFIGURE_OPTS="--with-openssl-dir=/usr/local/opt/openssl"
  export CFLAGS=-Wno-error=shorten-64-to-32
fi

